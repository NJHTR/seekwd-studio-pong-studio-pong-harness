import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { CHAT_MESSAGE_ROLE, CHAT_MESSAGE_STATUS } from '../constants';

const EMPTY_MODEL_RESPONSE_ERROR =
	'The model finished without returning an answer. Try again or use another model.';
const MODEL_STREAM_STALL_ERROR =
	/^The model stream stalled: no data received for \d+ seconds\. This is usually a transient connection issue — please try again\.$/;

/** Live errors and saved history carry the server's error text without a retry code. */
export function isRetryableChatError(message: ChatMessage | undefined): boolean {
	return (
		message?.role === CHAT_MESSAGE_ROLE.ASSISTANT &&
		message.status === CHAT_MESSAGE_STATUS.ERROR &&
		(EMPTY_MODEL_RESPONSE_ERROR === message.content ||
			MODEL_STREAM_STALL_ERROR.test(message.content))
	);
}

/** True for an error that carries the given HTTP status, as `ResponseError` does. */
function isHttpStatusError(error: unknown, status: number): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'httpStatusCode' in error &&
		error.httpStatusCode === status
	);
}

/** True for a `ResponseError`-shaped 404, as the agent REST endpoints throw it. */
export function isNotFoundError(error: unknown): boolean {
	return isHttpStatusError(error, 404);
}

/**
 * True when an approval decision can no longer apply: 409 for an approval that
 * is decided or expired, and 404 for one that the thread does not know. The
 * card then shows that it is no longer valid instead of offering the choices.
 */
export function isApprovalGoneError(error: unknown): boolean {
	return isHttpStatusError(error, 409) || isHttpStatusError(error, 404);
}
