import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';
import type { Component } from 'vue';

import PongSettingsLayout from './SettingsLayout.vue';
import PongDataTableServer from '../PongDataTableServer';
import PongSettingsPageHeader from '../PongSettingsPageHeader';
import PongSettingsRow from '../PongSettingsRow';
import PongSettingsRowGroup from '../PongSettingsRowGroup';
import PongSettingsSection from '../PongSettingsSection';
import PongSwitch from '../PongSwitch';
import PongText from '../PongText';

const meta = {
	title: 'Areas/Settings/SettingsLayout',
	component: PongSettingsLayout,
	argTypes: {
		showBack: { control: 'boolean' },
		backLabel: { control: 'text' },
		fullWidth: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'Pads the settings page (24px sides/top, 48px bottom), centers the content and caps it at the content max-width (`--settings-content--max-width`, 45rem / 720px), and optionally renders the ghost back action pinned to the top-left. Set `fullWidth` to let wide content (e.g. a table) span the padded container; the page header always stays centered at 720px so its position is consistent across pages. The page-header → content gap is fixed at 48px (`--spacing--2xl`), enforced here via `.content > header + *` (owned by the following element so it never depends on margin-collapsing) and not configurable; other direct children fall back to a 24px (`--spacing--lg`) rhythm.',
			},
		},
	},
} satisfies Meta<typeof PongSettingsLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = `
	<PongSettingsPageHeader
		title="Security & login"
		description="Your 2FA setup, passkeys, active sessions, and authorized OAuth applications."
		docs-url="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
	/>
	<PongSettingsSection title="Sign-in" description="How you sign in to pong.">
		<PongSettingsRowGroup>
			<PongSettingsRow title="Telemetry" description="Share anonymous usage data.">
				<template #action><PongSwitch v-model="enabled" /></template>
			</PongSettingsRow>
			<PongSettingsRow title="Beta features" description="Opt in to early features.">
				<template #action><PongSwitch v-model="enabled" /></template>
			</PongSettingsRow>
		</PongSettingsRowGroup>
	</PongSettingsSection>
`;

const renderPage: Story['render'] = (args) => ({
	components: {
		PongSettingsLayout,
		PongSettingsPageHeader,
		PongSettingsSection,
		PongSettingsRowGroup,
		PongSettingsRow,
		PongSwitch,
	},
	setup() {
		const enabled = ref(true);
		const onBack = () => alert('back');
		return { args, enabled, onBack };
	},
	template: `<PongSettingsLayout v-bind="args" @back="onBack">${page}</PongSettingsLayout>`,
});

export const Default: Story = {
	render: renderPage,
	args: {
		showBack: false,
	},
};

export const WithBackButton: Story = {
	render: renderPage,
	args: {
		showBack: true,
		backLabel: 'Back to app',
	},
};

export const NestedBackLabel: Story = {
	render: renderPage,
	args: {
		showBack: true,
		backLabel: 'Back to Security settings',
	},
	parameters: {
		docs: {
			description: {
				story:
					'On a nested sub-page, set `back-label` to express where back goes (e.g. "Back to Security settings"). The label is also the back button’s accessible name.',
			},
		},
	},
};

const tablePage = `
	<PongSettingsPageHeader
		title="API keys"
		description="Use your API keys to control pong programmatically."
		docs-url="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
	/>
	<PongSettingsSection>
		<PongDataTableServer :headers="headers" :items="items" :items-length="items.length">
			<template #[slotApiKey]="{ value }">
				<PongText size="small" color="text-base">{{ value }}</PongText>
			</template>
		</PongDataTableServer>
	</PongSettingsSection>
`;

export const FullWidthTable: Story = {
	render: (args) => ({
		components: {
			PongSettingsLayout,
			PongSettingsPageHeader,
			PongSettingsSection,
			PongDataTableServer: PongDataTableServer as unknown as Component,
			PongText,
		},
		setup() {
			const headers = [
				{ title: 'Label', key: 'label' },
				{ title: 'API key', key: 'apiKey', disableSort: true },
				{ title: 'Created', key: 'created' },
				{ title: 'Last used', key: 'lastUsed' },
			];
			const items = [
				{
					id: '1',
					label: 'Production',
					apiKey: '••••••••••••3f9a',
					created: '7 months ago',
					lastUsed: '3 min ago',
				},
				{
					id: '2',
					label: 'CI / CD',
					apiKey: '••••••••••••a17c',
					created: '7 days ago',
					lastUsed: '14 min ago',
				},
				{
					id: '3',
					label: 'Staging',
					apiKey: '••••••••••••4b2e',
					created: '17 hours ago',
					lastUsed: 'Yesterday',
				},
				{
					id: '4',
					label: 'Local dev',
					apiKey: '••••••••••••9d05',
					created: '3 months ago',
					lastUsed: 'Last week',
				},
			];
			const slotApiKey = 'item.apiKey';
			return { args, headers, items, slotApiKey };
		},
		template: `<PongSettingsLayout v-bind="args" show-back back-label="Back">${tablePage}</PongSettingsLayout>`,
	}),
	args: {
		fullWidth: true,
	},
};
