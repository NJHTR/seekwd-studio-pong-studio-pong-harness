import type { CloseReason } from '@pong/imap';
import { type ITriggerFunctions, NodeOperationError } from 'pong-workflow';

/** `error` already went out through `onError`; only an unexplained close is news. */
export const closeHandler =
	(ctx: ITriggerFunctions) =>
	(reason: CloseReason, cause?: Error): void => {
		if (reason !== 'dropped') {
			ctx.logger.debug(`Email Read Imap: Connection closed (${reason})`);
			return;
		}

		ctx.logger.error('Email Read Imap: Connection closed unexpectedly', { error: cause });
		ctx.emitError(
			new NodeOperationError(ctx.getNode(), 'IMAP connection closed unexpectedly', {
				description:
					'The IMAP server closed the connection without reporting an error, usually because the server (or a proxy/firewall) periodically closes long-lived connections, or was temporarily unavailable. pong will automatically retry reactivating the workflow.',
			}),
		);
	};
