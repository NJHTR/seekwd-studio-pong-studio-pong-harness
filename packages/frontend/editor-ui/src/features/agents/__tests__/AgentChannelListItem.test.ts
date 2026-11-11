import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelListItem from '../components/AgentChannelListItem.vue';

vi.mock('@pong/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const integration = {
	type: 'slack',
	label: 'Slack',
	icon: 'slack',
	credentialTypes: ['slackOAuth2Api'],
};

function mountItem(
	configured: boolean,
	connected: boolean,
	extra: { notRunning?: boolean; runtimeError?: string } = {},
) {
	return mount(AgentChannelListItem, {
		props: {
			integration,
			configured,
			connected,
			connectAction: { label: 'generic.connect' },
			...extra,
		},
		global: {
			stubs: {
				PongButton: { template: '<button><slot /></button>' },
				PongDropdownMenu: {
					template: '<div data-testid="channel-actions"><slot name="trigger" /></div>',
				},
				PongIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
				PongText: { template: '<span><slot /></span>' },
				PongTooltip: {
					props: ['content', 'disabled'],
					template: '<div :data-tooltip="content" :data-tooltip-disabled="disabled"><slot /></div>',
				},
			},
		},
	});
}

describe('AgentChannelListItem', () => {
	it.each([
		{ configured: true, connected: false, label: 'agents.channels.modal.configured' },
		{ configured: true, connected: true, label: 'agents.channels.modal.connected' },
		{ configured: false, connected: false, label: 'generic.connect' },
	])('renders the channel state for $label', ({ configured, connected, label }) => {
		const wrapper = mountItem(configured, connected);

		expect(wrapper.text()).toContain(label);
		expect(wrapper.find('[data-testid="agent-channel-connected-indicator"]').exists()).toBe(
			configured,
		);
		if (configured) {
			expect(wrapper.find('[data-icon="check"]').exists()).toBe(true);
		}
	});

	describe('a channel that failed to start', () => {
		it('reads as not running rather than configured', () => {
			const wrapper = mountItem(true, false, { notRunning: true });

			expect(wrapper.text()).toContain('agents.channels.modal.notRunning');
			expect(wrapper.text()).not.toContain('agents.channels.modal.configured');
			expect(wrapper.find('[data-testid="agent-channel-not-running-indicator"]').exists()).toBe(
				true,
			);
			expect(wrapper.find('[data-testid="agent-channel-connected-indicator"]').exists()).toBe(
				false,
			);
		});

		it('explains why on hover', () => {
			const wrapper = mountItem(true, false, {
				notRunning: true,
				runtimeError: 'This Telegram credential is already connected to agent "Support"',
			});

			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip')).toBe(
				'This Telegram credential is already connected to agent "Support"',
			);
			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip-disabled')).toBe('false');
		});

		it('still says something when the failure came with no message', () => {
			const wrapper = mountItem(true, false, { notRunning: true });

			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip')).toBe(
				'agents.channels.modal.notRunning.tooltip',
			);
		});

		it('leaves the tooltip off a healthy channel', () => {
			const wrapper = mountItem(true, true);

			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip-disabled')).toBe('true');
		});
	});

	describe('a channel with a configured-state menu (pong Chat)', () => {
		const pongChatIntegration = {
			type: 'pong_chat',
			label: 'pong Chat',
			icon: 'message-square',
			credentialTypes: [],
		};
		const menuItems = [
			{ id: 'edit', label: 'agents.channels.pongChat.edit' },
			{ id: 'remove', label: 'agents.channels.pongChat.makeUnavailable' },
		];

		function mountPongChatItem() {
			const dropdownMenuStub = {
				name: 'PongDropdownMenu',
				props: ['items'],
				emits: ['select'],
				template: `
					<div data-testid="channel-actions">
						<slot name="trigger" />
						<button
							v-for="item in items"
							:key="item.id"
							:data-testid="'menu-item-' + item.id"
							@click="$emit('select', item.id)"
						>
							{{ item.label }}
						</button>
					</div>
				`,
			};
			return mount(AgentChannelListItem, {
				props: {
					integration: pongChatIntegration,
					configured: true,
					connected: false,
					connectAction: { label: 'agents.channels.pongChat.makeAvailable' },
					configuredLabel: 'agents.channels.pongChat.available',
					menuItems,
				},
				global: {
					stubs: {
						PongButton: { template: '<button><slot /></button>' },
						// The real component's internal name is `DropdownMenu`, not the
						// `PongDropdownMenu` it's re-exported as — stub matching needs both.
						PongDropdownMenu: dropdownMenuStub,
						DropdownMenu: dropdownMenuStub,
						PongIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
						PongText: { template: '<span><slot /></span>' },
						PongTooltip: { template: '<div><slot /></div>' },
					},
				},
			});
		}

		it('shows "Available" regardless of connected state', () => {
			const wrapper = mountPongChatItem();

			expect(wrapper.text()).toContain('agents.channels.pongChat.available');
			expect(wrapper.text()).not.toContain('agents.channels.modal.configured');
		});

		it('opens a menu instead of emitting edit directly on click', async () => {
			const wrapper = mountPongChatItem();

			expect(wrapper.find('[data-testid="channel-actions"]').exists()).toBe(true);
			await wrapper.get('[data-testid="agent-channel-connected-trigger"]').trigger('click');

			expect(wrapper.emitted('edit')).toBeUndefined();
		});

		it('emits edit when the Edit item is selected', async () => {
			const wrapper = mountPongChatItem();

			await wrapper.get('[data-testid="menu-item-edit"]').trigger('click');

			expect(wrapper.emitted('edit')).toEqual([['pong_chat']]);
		});

		it('emits remove when Make unavailable is selected', async () => {
			const wrapper = mountPongChatItem();

			await wrapper.get('[data-testid="menu-item-remove"]').trigger('click');

			expect(wrapper.emitted('remove')).toEqual([['pong_chat']]);
		});
	});

	it('still emits edit directly for a channel with no menu', async () => {
		const wrapper = mountItem(true, true);

		await wrapper.get('[data-testid="agent-channel-connected-indicator"]').trigger('click');

		expect(wrapper.emitted('edit')).toEqual([['slack']]);
	});

	it('renders registry-provided connect action metadata', () => {
		const wrapper = mount(AgentChannelListItem, {
			props: {
				integration,
				configured: false,
				connected: false,
				connectAction: { label: 'Add to Slack', icon: 'plus' },
			},
			global: {
				stubs: {
					PongButton: {
						props: ['icon'],
						template: '<button :data-icon="icon"><slot /></button>',
					},
					PongIcon: { template: '<i />' },
					PongText: { template: '<span><slot /></span>' },
				},
			},
		});

		expect(wrapper.get('button').text()).toContain('Add to Slack');
		expect(wrapper.get('button').attributes('data-icon')).toBe('plus');
	});
});
