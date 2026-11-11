import { ConflictError, UnprocessableRequestError } from '@pong/errors';

import type { BlockingIssue } from '../pong-packages.types';

export function toImportBlockedError(
	issues: BlockingIssue[],
): ConflictError | UnprocessableRequestError {
	const message =
		`Import blocked: ${issues.length} issue(s) must be resolved before the package ` +
		'can be imported.';

	if (
		issues.some(
			(issue) =>
				issue.type === 'agent-conflict' ||
				issue.type === 'workflow-conflict' ||
				issue.type === 'workflow-lineage-conflict' ||
				issue.type === 'workflow-id-conflict' ||
				issue.type === 'workflow-folder-conflict' ||
				issue.type === 'workflow-removal-conflict' ||
				issue.type === 'project-conflict' ||
				issue.type === 'folder-conflict' ||
				issue.type === 'variable-conflict' ||
				issue.type === 'credential-conflict' ||
				(issue.type === 'data-table-unresolved' &&
					(issue.kind === 'id-conflict' || issue.kind === 'name-conflict')) ||
				(issue.type === 'tag-unresolved' &&
					(issue.kind === 'rename-drift' || issue.kind === 'name-collision')),
		)
	) {
		return new ConflictError(message, undefined, { issues });
	}

	return new UnprocessableRequestError(message, undefined, { issues });
}
