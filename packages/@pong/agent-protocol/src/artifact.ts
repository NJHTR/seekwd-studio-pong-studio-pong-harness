import { createHash } from 'node:crypto';

import { z } from 'zod';

/**
 * Artifact references are content-addressed and immutable:
 * `artifact://sha256/<64 lowercase hex>`.
 *
 * Hashing uses `node:crypto` on purpose. `@pong/utils/sha256` is browser-first,
 * accepts strings only and is async; this package must hash raw bytes (files,
 * diffs) synchronously. The algorithm and hex output are identical.
 */
export const ARTIFACT_HASH_ALGORITHM = 'sha256';
export const ARTIFACT_URI_SCHEME = 'artifact';
export const ARTIFACT_DIGEST_HEX_LENGTH = 64;
export const MAX_ARTIFACT_SUMMARY_CHARS = 400;
export const MAX_ARTIFACT_PARENTS = 16;

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const ARTIFACT_URI_PATTERN = /^artifact:\/\/sha256\/([0-9a-f]{64})$/;
const MEDIA_TYPE_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

export const artifactDigestSchema = z
	.string()
	.regex(DIGEST_PATTERN, 'artifact digest must be 64 lowercase hex characters');

export const artifactUriSchema = z
	.string()
	.regex(ARTIFACT_URI_PATTERN, 'artifact URI must be artifact://sha256/<64 lowercase hex>');

export const mediaTypeSchema = z
	.string()
	.regex(MEDIA_TYPE_PATTERN, 'media type must look like "type/subtype" in lowercase');

export class ArtifactUriError extends Error {
	readonly code = 'invalid_artifact_uri';

	constructor(message: string) {
		super(message);
		this.name = 'ArtifactUriError';
	}
}

/** Parse a content-addressed artifact URI. Throws `ArtifactUriError` when invalid. */
export function parseArtifactUri(uri: string): { digest: string } {
	const match = ARTIFACT_URI_PATTERN.exec(uri);

	if (match === null) {
		throw new ArtifactUriError(`Invalid artifact URI: ${uri}`);
	}

	const digest = match[1];

	if (digest === undefined) {
		throw new ArtifactUriError(`Invalid artifact URI: ${uri}`);
	}

	return { digest };
}

/** Non-throwing variant of `parseArtifactUri`. */
export function tryParseArtifactUri(
	uri: string,
): { ok: true; digest: string } | { ok: false; error: ArtifactUriError } {
	try {
		return { ok: true, digest: parseArtifactUri(uri).digest };
	} catch (error) {
		if (error instanceof ArtifactUriError) {
			return { ok: false, error };
		}

		throw error;
	}
}

export function isArtifactUri(value: string): boolean {
	return ARTIFACT_URI_PATTERN.test(value);
}

/** Build `artifact://sha256/<digest>` from a digest. Throws on invalid digests. */
export function createArtifactUri(digest: string): string {
	if (!DIGEST_PATTERN.test(digest)) {
		throw new ArtifactUriError(`Invalid artifact digest: ${digest}`);
	}

	return `artifact://sha256/${digest}`;
}

function toBytes(content: string | Uint8Array): Uint8Array {
	return typeof content === 'string' ? new TextEncoder().encode(content) : content;
}

/** SHA-256 of artifact bytes, as lowercase hex. */
export function hashArtifactContent(content: string | Uint8Array): string {
	return createHash(ARTIFACT_HASH_ALGORITHM).update(toBytes(content)).digest('hex');
}

export const artifactManifestSchema = z
	.object({
		uri: artifactUriSchema,
		media_type: mediaTypeSchema,
		bytes: z.number().int().nonnegative(),
		summary: z.string().min(1).max(MAX_ARTIFACT_SUMMARY_CHARS),
		parents: z.array(artifactUriSchema).max(MAX_ARTIFACT_PARENTS).default([]),
	})
	.strict();

export type ArtifactManifest = z.infer<typeof artifactManifestSchema>;

export interface CreateArtifactManifestInput {
	readonly content: string | Uint8Array;
	readonly media_type: string;
	readonly summary: string;
	readonly parents?: readonly string[];
}

/**
 * Build a manifest from content. The digest is derived from the bytes, so a
 * changed payload always yields a new URI (versioning is `parents[]`, not edits).
 */
export function createArtifactManifest(input: CreateArtifactManifestInput): ArtifactManifest {
	const bytes = toBytes(input.content);
	const digest = hashArtifactContent(bytes);

	return artifactManifestSchema.parse({
		uri: createArtifactUri(digest),
		media_type: input.media_type,
		bytes: bytes.byteLength,
		summary: input.summary,
		parents: input.parents === undefined ? [] : [...input.parents],
	});
}

/** Recompute the digest of `content` and compare it with the manifest URI. */
export function verifyArtifactContent(
	manifest: ArtifactManifest,
	content: string | Uint8Array,
): boolean {
	return manifest.uri === createArtifactUri(hashArtifactContent(content));
}
