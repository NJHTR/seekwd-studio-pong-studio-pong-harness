import { inject } from 'vue';

import { ChatOptionsSymbol } from '@pong/chat/constants';
import type { ChatOptions } from '@pong/chat/types';

export function useOptions() {
	const options = inject(ChatOptionsSymbol) as ChatOptions;

	return {
		options,
	};
}
