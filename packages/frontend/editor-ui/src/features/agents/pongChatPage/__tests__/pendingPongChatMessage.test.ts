import {
	stashPendingPongChatMessage,
	consumePendingPongChatMessage,
} from '../pendingPongChatMessage';

describe('pendingPongChatMessage', () => {
	it('returns the stored message for a matching agent id', () => {
		const file = new File(['a'], 'a.txt');
		stashPendingPongChatMessage({ agentId: 'agent-1', text: 'hello', files: [file] });

		expect(consumePendingPongChatMessage('agent-1')).toEqual({
			agentId: 'agent-1',
			text: 'hello',
			files: [file],
		});
	});

	it('returns undefined and clears the entry for a different agent id', () => {
		stashPendingPongChatMessage({ agentId: 'agent-1', text: 'hello', files: [] });

		expect(consumePendingPongChatMessage('agent-2')).toBeUndefined();
		// The mismatched read already cleared it, so even the original agent gets nothing.
		expect(consumePendingPongChatMessage('agent-1')).toBeUndefined();
	});

	it('is one-shot: a second take for the same agent returns undefined', () => {
		stashPendingPongChatMessage({ agentId: 'agent-1', text: 'hello', files: [] });

		expect(consumePendingPongChatMessage('agent-1')).toBeDefined();
		expect(consumePendingPongChatMessage('agent-1')).toBeUndefined();
	});

	it('returns undefined when nothing was ever stored', () => {
		expect(consumePendingPongChatMessage('agent-1')).toBeUndefined();
	});
});
