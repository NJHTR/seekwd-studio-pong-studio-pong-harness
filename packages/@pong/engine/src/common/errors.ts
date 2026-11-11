import { BaseError } from '@pong/errors';

export { UnexpectedError } from '@pong/errors';

/**
 * Thrown when the engine reaches a code path that isn't implemented yet.
 * Not a `UserError`, because that level is not reported to Sentry.
 */
export class UnimplementedError extends BaseError {}
