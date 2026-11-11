import { Logger } from '@pong/backend-common';
import { Container } from '@pong/di';
import { getErrorMessage } from '@pong/utils/errors/get-error-message';

import { OtelSdk } from './otel-sdk';

export function startObservability(): void {
	try {
		Container.get(OtelSdk).start();
	} catch (error) {
		Container.get(Logger).error('Failed to set up observability at startup, so tracing stays off', {
			error: getErrorMessage(error),
		});
	}
}
