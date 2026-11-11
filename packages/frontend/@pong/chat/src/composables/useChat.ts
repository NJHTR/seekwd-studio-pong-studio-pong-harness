import { inject } from 'vue';

import { ChatSymbol } from '@pong/chat/constants';
import type { Chat } from '@pong/chat/types';

export function useChat() {
	return inject(ChatSymbol) as Chat;
}
