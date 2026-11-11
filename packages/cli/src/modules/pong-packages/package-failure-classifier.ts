import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnprocessableRequestError,
	UserError,
} from '@pong/errors';

import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from './entities/package-export.errors';
import type { PackageFailureReason } from './pong-packages.types';

/**
 * Classifies a thrown error into the `reason` reported on the
 * `pong.audit.pong-package.<op>.failed` audit event.
 */
export function classifyPackageFailure(error: unknown): PackageFailureReason {
	if (error instanceof PackageEntityAccessDeniedError) return 'access-denied';
	if (error instanceof PackageEntityNotFoundError) return 'entity-not-found';
	if (error instanceof PackageExportBlockedError) return 'blocked';
	if (error instanceof ForbiddenError) return 'access-denied';
	if (error instanceof NotFoundError) return 'entity-not-found';
	if (error instanceof ConflictError || error instanceof UnprocessableRequestError) {
		return 'blocked';
	}
	if (error instanceof BadRequestError) return 'validation';
	if (error instanceof UserError) return 'entity-not-found'; // e.g. folder not found in target project
	return 'validation';
}
