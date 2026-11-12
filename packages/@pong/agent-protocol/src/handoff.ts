/**
 * Adaptive handoff selector.
 *
 * The M1 A/B baseline (`docs/poc/m1-ab-baseline.md`, cited in ADR-001 §10.3)
 * showed that structured artifact handoff loses tokens on small payloads
 * (+80% tokens for a one-file change) but wins decisively once prose cannot
 * carry the facts (large payload: 0/3 vs 5/5 first-pass, ~1/5.7 tokens).
 *
 * Therefore the default is prose. Escalate to an artifact reference only when
 * the prose budget is exceeded or the receiver needs byte-level fidelity.
 */
export const DEFAULT_PROSE_BUDGET_CHARS = 600;
export const DEFAULT_ARTIFACT_FILE_THRESHOLD = 3;

export const HANDOFF_MODES = ['prose', 'artifact'] as const;

export const HANDOFF_REASONS = [
	'within_prose_budget',
	'over_prose_budget',
	'byte_fidelity_required',
	'diff_required',
	'manifest_required',
	'multi_file',
] as const;

export type HandoffMode = (typeof HANDOFF_MODES)[number];
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

export interface HandoffCandidate {
	/** Serialized prose that would be sent if prose mode is selected. */
	readonly prose: string;
	/** Number of changed files, when known. Falls back to `changedFiles.length`. */
	readonly fileCount?: number;
	readonly changedFiles?: readonly string[];
	/** The receiver must reproduce bytes exactly (hashes, fixtures, binary). */
	readonly requiresByteFidelity?: boolean;
	/** The receiver needs the diff itself, not a description of it. */
	readonly requiresDiff?: boolean;
	/** The receiver needs the artifact manifest (`media_type`, `bytes`, `parents[]`). */
	readonly requiresManifest?: boolean;
}

export interface HandoffOptions {
	/** Prose budget in Unicode code points. Defaults to 600. */
	readonly proseBudgetChars?: number;
	/** Escalate when the change touches more than this many files. Defaults to 3. */
	readonly artifactFileThreshold?: number;
}

export interface HandoffDecision {
	readonly mode: HandoffMode;
	readonly reason: HandoffReason;
	/** UTF-8 size of the prose candidate, for telemetry. */
	readonly estimatedBytes: number;
	/** Prose size in Unicode code points, compared with the budget. */
	readonly proseChars: number;
}

/** Count Unicode code points, so astral characters count once, not twice. */
function countChars(text: string): number {
	return Array.from(text).length;
}

function utf8Bytes(text: string): number {
	return new TextEncoder().encode(text).byteLength;
}

function resolvePositiveInteger(value: number | undefined, fallback: number, name: string): number {
	const resolved = value ?? fallback;

	if (!Number.isInteger(resolved) || resolved <= 0) {
		throw new RangeError(`${name} must be a positive integer, got ${resolved}`);
	}

	return resolved;
}

function resolveFileCount(candidate: HandoffCandidate): number {
	if (candidate.fileCount !== undefined) {
		if (!Number.isInteger(candidate.fileCount) || candidate.fileCount < 0) {
			throw new RangeError(`fileCount must be a non-negative integer, got ${candidate.fileCount}`);
		}

		return candidate.fileCount;
	}

	return candidate.changedFiles === undefined ? 0 : candidate.changedFiles.length;
}

/**
 * Decide the handoff representation. Fidelity flags win over size, because a
 * truncated byte-exact payload is always wrong; multi-file wins over the prose
 * budget because it is a stable structural signal.
 */
export function selectHandoff(
	candidate: HandoffCandidate,
	options: HandoffOptions = {},
): HandoffDecision {
	const proseBudgetChars = resolvePositiveInteger(
		options.proseBudgetChars,
		DEFAULT_PROSE_BUDGET_CHARS,
		'proseBudgetChars',
	);
	const artifactFileThreshold = resolvePositiveInteger(
		options.artifactFileThreshold,
		DEFAULT_ARTIFACT_FILE_THRESHOLD,
		'artifactFileThreshold',
	);

	const proseChars = countChars(candidate.prose);
	const estimatedBytes = utf8Bytes(candidate.prose);
	const artifact = (reason: HandoffReason): HandoffDecision => ({
		mode: 'artifact',
		reason,
		estimatedBytes,
		proseChars,
	});

	if (candidate.requiresByteFidelity === true) {
		return artifact('byte_fidelity_required');
	}

	if (candidate.requiresDiff === true) {
		return artifact('diff_required');
	}

	if (candidate.requiresManifest === true) {
		return artifact('manifest_required');
	}

	if (resolveFileCount(candidate) > artifactFileThreshold) {
		return artifact('multi_file');
	}

	if (proseChars > proseBudgetChars) {
		return artifact('over_prose_budget');
	}

	return { mode: 'prose', reason: 'within_prose_budget', estimatedBytes, proseChars };
}
