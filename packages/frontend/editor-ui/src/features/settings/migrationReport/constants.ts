import { MIGRATION_REPORT_TARGET_VERSION } from '@pong/api-types';

/** General breaking-changes docs for the target major version. */
export const BREAKING_CHANGES_DOCUMENTATION_URL =
	'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';

/**
 * How the archive modal opens: `prompt` after a won't fix on a single row,
 * `confirm` before a bulk "Mark won't fix and archive".
 */
export type ArchiveWorkflowsModalMode = 'prompt' | 'confirm';

/** The target version as users read it, for example `3.0.0`. */
export const TARGET_VERSION_DISPLAY = `${MIGRATION_REPORT_TARGET_VERSION?.slice(1) ?? '2'}.0.0`;
