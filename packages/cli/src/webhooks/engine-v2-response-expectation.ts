import type { ResponseExpectation } from '@pong/engine';
import type { IWorkflowExecutionDataProcess } from 'pong-workflow';

type EngineV2ResponseMode = NonNullable<
	IWorkflowExecutionDataProcess['engineV2Response']
>['responseMode'];

/**
 * Tells engine v2 which answer the caller waits for.
 */
export function toResponseExpectation(responseMode?: EngineV2ResponseMode): ResponseExpectation {
	switch (responseMode) {
		case 'lastNode':
			return { kind: 'runEnd' };
		case 'responseNode':
			return { kind: 'stepResponse' };
		case 'streaming':
			return { kind: 'stream' };
		default:
			// `onReceived`, triggers, pollers and manual runs: nobody listens.
			return { kind: 'none' };
	}
}
