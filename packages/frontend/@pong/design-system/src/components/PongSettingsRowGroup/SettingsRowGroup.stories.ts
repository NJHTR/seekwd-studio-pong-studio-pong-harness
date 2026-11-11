import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import PongSettingsRowGroup from './SettingsRowGroup.vue';
import PongButton from '../PongButton';
import PongInput from '../PongInput';
import PongSettingsRow from '../PongSettingsRow';
import PongSwitch from '../PongSwitch';

const meta = {
	title: 'Areas/Settings/SettingsRowGroup',
	component: PongSettingsRowGroup,
	parameters: {
		docs: {
			description: {
				component:
					'A bordered, rounded card that stacks settings rows. The last row hides its divider automatically; individual rows can opt out to merge into a sub-section.',
			},
		},
	},
} satisfies Meta<typeof PongSettingsRowGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (inner: string) => `<div style="max-width: 45rem;">${inner}</div>`;

export const Default: Story = {
	render: () => ({
		components: { PongSettingsRowGroup, PongSettingsRow, PongSwitch },
		setup() {
			const a = ref(true);
			const b = ref(false);
			const c = ref(true);
			return { a, b, c };
		},
		template: frame(`
			<PongSettingsRowGroup>
				<PongSettingsRow title="Telemetry" description="Share anonymous usage data.">
					<template #action><PongSwitch v-model="a" /></template>
				</PongSettingsRow>
				<PongSettingsRow title="Beta features" description="Opt in to early features.">
					<template #action><PongSwitch v-model="b" /></template>
				</PongSettingsRow>
				<PongSettingsRow title="Email notifications" description="Last row hides its divider automatically.">
					<template #action><PongSwitch v-model="c" /></template>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		`),
	}),
};

export const MixedLayouts: Story = {
	render: () => ({
		components: { PongSettingsRowGroup, PongSettingsRow, PongSwitch, PongButton, PongInput },
		setup() {
			const enabled = ref(true);
			return { enabled };
		},
		template: frame(`
			<PongSettingsRowGroup>
				<PongSettingsRow title="Telemetry" description="Horizontal row with a switch.">
					<template #action><PongSwitch v-model="enabled" /></template>
				</PongSettingsRow>
				<PongSettingsRow title="Webhook URL" description="Vertical row with a wide input." layout="vertical">
					<template #action><PongInput placeholder="https://example.com/webhook" /></template>
				</PongSettingsRow>
				<PongSettingsRow title="Password" description="Horizontal row with a button.">
					<template #action><PongButton variant="outline" size="small" label="Change password" /></template>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		`),
	}),
};

export const MergedSubsection: Story = {
	render: () => ({
		components: { PongSettingsRowGroup, PongSettingsRow, PongButton },
		template: frame(`
			<PongSettingsRowGroup>
				<PongSettingsRow title="2 other active sessions" :show-divider="false">
					<template #action><PongButton variant="outline" size="small" label="Revoke all" /></template>
				</PongSettingsRow>
				<PongSettingsRow title="Safari on iPhone" description="Gdynia, Poland · last seen 4 hours ago" :show-divider="false">
					<template #action><PongButton variant="outline" size="small" label="Revoke" /></template>
				</PongSettingsRow>
				<PongSettingsRow title="pong CLI" description="headless · last seen 3 days ago" />
			</PongSettingsRowGroup>
		`),
	}),
};

export const SingleRow: Story = {
	render: () => ({
		components: { PongSettingsRowGroup, PongSettingsRow, PongButton },
		template: frame(`
			<PongSettingsRowGroup>
				<PongSettingsRow title="Plan" description="Enterprise">
					<template #action><PongButton variant="outline" size="small" label="Manage plan" /></template>
				</PongSettingsRow>
			</PongSettingsRowGroup>
		`),
	}),
};
