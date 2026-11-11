import { setNotify } from '@pong/composables/useToast';
import { useNotificationsStore } from '@pong/stores/notifications.store';
import { ElNotification } from 'element-plus';

/**
 * The single bootstrap registration for the package-side `useToast`
 * (`@pong/composables`), which sits below the stores tier and so imports neither
 * element-plus nor `@pong/stores` — it owns only the contract.
 *
 * Suppression lives here rather than in the package: returning `undefined` tells
 * `showMessage` the app declined to show this notification, and it drops it
 * without a sticky-queue entry or error telemetry.
 *
 * Called from `initializeCore()`, which the router runs in its first
 * `beforeEach` — before any view renders, and before that function's own
 * startup-error toast. The store resolves inside the closure, not here, so
 * registration does not require an active pinia yet.
 */
export function registerToastNotifier(): void {
	setNotify((options) => {
		const notifications = useNotificationsStore();
		const suppressed = notifications.areNotificationsSuppressed;
		const allowErrors = notifications.allowErrorNotificationsWhenSuppressed;

		if (suppressed && !(allowErrors && options.type === 'error')) return undefined;

		return ElNotification(options);
	});
}
