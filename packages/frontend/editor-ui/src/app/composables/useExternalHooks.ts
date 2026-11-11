import type { IDataObject } from 'pong-workflow';
import type {
	ExternalHooks,
	ExternalHooksKey,
	ExternalHooksGenericContext,
	ExtractExternalHooksMethodPayloadFromKey,
} from '@/app/types/externalHooks';
import { useWebhooksStore } from '@/app/stores/webhooks.store';
import { setExternalHooks } from '@pong/composables/useExternalHooks';

/**
 * Concrete runner. Loosely typed to match the `@pong/composables` contract so it
 * can be registered for package-side consumers; the exported {@link runExternalHook}
 * wrapper below re-adds per-event type-checking for direct call sites.
 */
async function runExternalHookInternal(eventName: string, metadata?: unknown): Promise<void> {
	if (!window.pongExternalHooks) {
		return;
	}

	const store = useWebhooksStore();

	const [resource, operator] = eventName.split('.') as [
		keyof ExternalHooks,
		keyof ExternalHooks[keyof ExternalHooks],
	];

	const context = window.pongExternalHooks[resource] as ExternalHooksGenericContext;
	if (context?.[operator]) {
		const hookMethods = context[operator];

		for (const hookMethod of hookMethods) {
			await hookMethod(store, metadata as IDataObject);
		}
	}
}

export async function runExternalHook<T extends ExternalHooksKey>(
	eventName: T,
	metadata?: ExtractExternalHooksMethodPayloadFromKey<T>,
): Promise<void> {
	await runExternalHookInternal(eventName, metadata);
}

// Register the concrete runner so package-side `useExternalHooks`
// (`@pong/composables`) can resolve it from any context. Runs on first import;
// `editor-ui` imports this module during bootstrap, before any consumer runs.
setExternalHooks({ run: runExternalHookInternal });

export function useExternalHooks() {
	return {
		run: runExternalHook,
	};
}
