import { configure, fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';

import PongChatHintPopover from '../components/PongChatHintPopover.vue';
import { PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS } from '../constants';

configure({ testIdAttribute: 'data-test-id' });

vi.mock('@pong/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const trackViewedPongChatHint = vi.fn();
const trackDismissedPongChatHint = vi.fn();
vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackViewedPongChatHint, trackDismissedPongChatHint }),
}));

const stubs = {
	PongPopover: {
		props: ['open'],
		emits: ['update:open'],
		template:
			'<div><slot name="trigger" /><div v-if="open"><slot name="content" /><button data-test-id="outside" @click="$emit(\'update:open\', false)" /></div></div>',
	},
	PongText: { template: '<span><slot /></span>' },
	PongButton: {
		props: ['label'],
		template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
	},
};

const renderComponent = createComponentRenderer(PongChatHintPopover, { global: { stubs } });

const baseProps = {
	hint: 'channel_chip' as const,
	title: 'Title',
	body: 'Body',
	agentId: 'a1',
};

describe('PongChatHintPopover', () => {
	beforeEach(() => {
		createTestingPinia();
		localStorage.removeItem(PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip);
		trackViewedPongChatHint.mockClear();
		trackDismissedPongChatHint.mockClear();
	});

	it('shows the hint and tracks the view when active', () => {
		const { getByTestId } = renderComponent({ props: { ...baseProps, active: true } });

		expect(getByTestId('pong-chat-hint-channel_chip')).toBeInTheDocument();
		expect(trackViewedPongChatHint).toHaveBeenCalledExactlyOnceWith({
			hint: 'channel_chip',
			agentId: 'a1',
		});
	});

	it('tracks the view once when the hint opens again', async () => {
		const { rerender } = renderComponent({ props: { ...baseProps, active: true } });

		await rerender({ ...baseProps, active: false });
		await rerender({ ...baseProps, active: true });

		expect(trackViewedPongChatHint).toHaveBeenCalledTimes(1);
	});

	it('stays closed and tracks nothing when inactive', () => {
		const { queryByTestId } = renderComponent({ props: { ...baseProps, active: false } });

		expect(queryByTestId('pong-chat-hint-channel_chip')).toBeNull();
		expect(trackViewedPongChatHint).not.toHaveBeenCalled();
	});

	it('remembers "Got it" and tracks the dismissal', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { ...baseProps, active: true },
		});

		await fireEvent.click(getByTestId('pong-chat-hint-channel_chip-got-it'));

		expect(localStorage.getItem(PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip)).toBe('true');
		expect(trackDismissedPongChatHint).toHaveBeenCalledExactlyOnceWith({
			hint: 'channel_chip',
			agentId: 'a1',
		});
		expect(queryByTestId('pong-chat-hint-channel_chip')).toBeNull();
	});

	it('stays open when the popover reports an outside interaction', async () => {
		const { getByTestId } = renderComponent({ props: { ...baseProps, active: true } });

		await fireEvent.click(getByTestId('outside'));

		expect(getByTestId('pong-chat-hint-channel_chip')).toBeInTheDocument();
		expect(localStorage.getItem(PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip)).toBeNull();
		expect(trackDismissedPongChatHint).not.toHaveBeenCalled();
	});

	it('never shows a hint the user already dismissed', () => {
		localStorage.setItem(PONG_CHAT_HINT_DISMISSED_STORAGE_KEYS.channel_chip, 'true');

		const { queryByTestId } = renderComponent({ props: { ...baseProps, active: true } });

		expect(queryByTestId('pong-chat-hint-channel_chip')).toBeNull();
		expect(trackViewedPongChatHint).not.toHaveBeenCalled();
	});
});
