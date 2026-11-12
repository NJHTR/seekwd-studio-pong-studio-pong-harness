import type { Component } from 'vue';
import type { BannerName } from '@pong/api-types';
import type { CalloutTheme } from '@pong/design-system';

/**
 * Registered banners. The local build intentionally leaves plan and license
 * banners out, so the registry is partial.
 */
export type PongBanners = {
	[key in BannerName]?: {
		priority: number;
		component: Component;
		content?: string;
		theme?: CalloutTheme;
		isDismissible?: boolean;
		dismissPermanently?: boolean;
	};
};
