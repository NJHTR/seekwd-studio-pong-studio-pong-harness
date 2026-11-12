import { describe, expect, it } from 'vitest';

import {
	artifactManifestSchema,
	createArtifactManifest,
	createArtifactUri,
	hashArtifactContent,
	isArtifactUri,
	parseArtifactUri,
	tryParseArtifactUri,
	verifyArtifactContent,
} from '../src';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

describe('artifact URIs', () => {
	it('round-trips a digest', () => {
		const uri = createArtifactUri(DIGEST_A);

		expect(uri).toBe(`artifact://sha256/${DIGEST_A}`);
		expect(parseArtifactUri(uri)).toEqual({ digest: DIGEST_A });
		expect(isArtifactUri(uri)).toBe(true);
	});

	it('rejects non-sha256 schemes', () => {
		expect(tryParseArtifactUri(`artifact://sha1/${DIGEST_A}`).ok).toBe(false);
		expect(tryParseArtifactUri(`artifact://sha256/${DIGEST_A}`).ok).toBe(true);
	});

	it('rejects uppercase or short digests', () => {
		expect(() => createArtifactUri(DIGEST_A.toUpperCase())).toThrow();
		expect(() => createArtifactUri(DIGEST_A.slice(0, 63))).toThrow();
		expect(isArtifactUri(`artifact://sha256/${DIGEST_A.toUpperCase()}`)).toBe(false);
	});

	it('throws a typed error with a stable code', () => {
		expect(() => parseArtifactUri('artifact://sha256/nope')).toThrow('Invalid artifact URI');

		try {
			parseArtifactUri('artifact://sha256/nope');
		} catch (error) {
			expect(error).toBeInstanceOf(Error);

			if (error instanceof Error && 'code' in error) {
				expect(error.code).toBe('invalid_artifact_uri');
			}
		}
	});
});

describe('content hashing', () => {
	it('hashes strings and their UTF-8 bytes identically', () => {
		const text = 'hello 世界';

		expect(hashArtifactContent(text)).toBe(hashArtifactContent(new TextEncoder().encode(text)));
	});

	it('is deterministic and lowercase hex', () => {
		const digest = hashArtifactContent('hello');

		expect(digest).toMatch(/^[0-9a-f]{64}$/);
		expect(digest).toBe(hashArtifactContent('hello'));
	});

	it('matches the known SHA-256 of the empty string', () => {
		expect(hashArtifactContent('')).toBe(
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		);
	});
});

describe('artifact manifests', () => {
	it('derives the URI from the content digest', () => {
		const manifest = createArtifactManifest({
			content: 'diff --git a/f b/f',
			media_type: 'application/vnd.pong.patch+unified-diff',
			summary: 'one file changed',
		});

		expect(manifest.uri).toBe(createArtifactUri(hashArtifactContent('diff --git a/f b/f')));
		expect(manifest.parents).toEqual([]);
		expect(manifest.bytes).toBe(18);
	});

	it('counts UTF-8 bytes, not code points', () => {
		const manifest = createArtifactManifest({
			content: '汉字',
			media_type: 'text/plain',
			summary: 'two characters',
		});

		expect(manifest.bytes).toBe(6);
	});

	it('keeps parents for versioning', () => {
		const manifest = createArtifactManifest({
			content: 'v2',
			media_type: 'text/plain',
			summary: 'second version',
			parents: [createArtifactUri(DIGEST_B)],
		});

		expect(manifest.parents).toEqual([createArtifactUri(DIGEST_B)]);
	});

	it('verifies untampered content and rejects tampering', () => {
		const manifest = createArtifactManifest({
			content: 'original',
			media_type: 'text/plain',
			summary: 'original content',
		});

		expect(verifyArtifactContent(manifest, 'original')).toBe(true);
		expect(verifyArtifactContent(manifest, 'tampered')).toBe(false);
	});

	it('rejects invalid manifests', () => {
		const valid = {
			uri: createArtifactUri(DIGEST_A),
			media_type: 'text/plain',
			bytes: 1,
			summary: 'ok',
			parents: [],
		};

		expect(artifactManifestSchema.safeParse(valid).success).toBe(true);
		expect(artifactManifestSchema.safeParse({ ...valid, summary: 'x'.repeat(401) }).success).toBe(
			false,
		);
		expect(artifactManifestSchema.safeParse({ ...valid, media_type: 'TEXT/PLAIN' }).success).toBe(
			false,
		);
		expect(artifactManifestSchema.safeParse({ ...valid, bytes: 1.5 }).success).toBe(false);
		expect(
			artifactManifestSchema.safeParse({ ...valid, parents: ['artifact://sha256/short'] }).success,
		).toBe(false);
	});
});
