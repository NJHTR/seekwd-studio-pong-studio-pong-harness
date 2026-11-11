import type { Component } from 'vue';
import type { BannerName } from '@pong/api-types';
import type { CalloutTheme } from '@pong/design-system';

export type PongBanners = {
	[key in BannerName]: {
		priority: number;
		component: Component;
		content?: string;
		theme?: CalloutTheme;
		isDismissible?: boolean;
		dismissPermanently?: boolean;
	};
};
