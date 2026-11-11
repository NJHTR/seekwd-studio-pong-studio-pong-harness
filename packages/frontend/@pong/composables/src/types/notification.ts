import type { Component, VNode } from 'vue';

export type NotificationType = '' | 'success' | 'warning' | 'error' | 'info';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * Notification payload accepted by the toast layer.
 *
 * Mirrors Element Plus' notification options (the shape the toast layer
 * ultimately forwards to `ElNotification`) but is declared inline so no
 * dependency on `element-plus` is carried across the package boundary.
 * `message` is required; every other field is optional.
 *
 * Owned here rather than in `@pong/stores/notifications.store` because it is the
 * toast layer's contract, and `@pong/composables` now sits below the stores tier
 * (PONG-100). The store re-exports it for existing importers.
 */
export interface NotificationOptions {
	message: string | VNode;
	title?: string;
	type?: NotificationType;
	icon?: string | Component;
	customClass?: string;
	duration?: number;
	position?: NotificationPosition;
	showClose?: boolean;
	dangerouslyUseHTMLString?: boolean;
	offset?: number;
	appendTo?: HTMLElement | string;
	zIndex?: number;
	onClick?: () => void;
	onClose?: () => void;
}
