import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import PongSettingsSection from './SettingsSection.vue';
import PongButton from '../PongButton';
import PongSettingsRow from '../PongSettingsRow';
import PongSettingsRowGroup from '../PongSettingsRowGroup';
import PongSwitch from '../PongSwitch';

const meta = {
	title: 'Areas/Settings/SettingsSection',
	component: PongSettingsSection,
	parameters: {
		docs: {
			description: {
				component:
					'An optionally titled section that wraps one or more row groups. The vertical rhythm is fixed by design and driven by spacing tokens — there are no spacing props to override: the section header (title/description) sits 16px (`--spacing--sm`) above its body, separate row groups within the section are 12px (`--spacing--xs`) apart, and adjacent sibling sections are 32px (`--spacing--xl`) apart.',
			},
		},
	},
} satisfies Meta<typeof PongSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const frame = (inner: string) => `<div style="max-width: 45rem;">${inner}</div>`;

export const Default: Story = {
	render: (args) => ({
		components: { PongSettingsSection, PongSettingsRowGroup, PongSettingsRow, PongSwitch },
		setup() {
			const enabled = ref(true);
			return { args, enabled };
		},
		template: frame(`
			<PongSettingsSection v-bind="args">
				<PongSettingsRowGroup>
					<PongSettingsRow title="Authenticator app" description="Six-digit codes from an app on your phone.">
						<template #action><PongSwitch v-model="enabled" /></template>
					</PongSettingsRow>
					<PongSettingsRow title="Security key" description="A small physical key you plug in or tap.">
						<template #action><PongSwitch v-model="enabled" /></template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>
		`),
	}),
	args: {
		title: 'Second factors',
		description: "Required by your admin. After your password, you'll be asked for one of these.",
	},
};

export const TitleOnly: Story = {
	render: (args) => ({
		components: { PongSettingsSection, PongSettingsRowGroup, PongSettingsRow, PongButton },
		setup: () => ({ args }),
		template: frame(`
			<PongSettingsSection v-bind="args">
				<PongSettingsRowGroup>
					<PongSettingsRow title="Current version" description="2.9.4" />
				</PongSettingsRowGroup>
			</PongSettingsSection>
		`),
	}),
	args: {
		title: 'Version and updates',
	},
};

export const NoHeader: Story = {
	render: () => ({
		components: { PongSettingsSection, PongSettingsRowGroup, PongSettingsRow, PongButton },
		template: frame(`
			<PongSettingsSection>
				<PongSettingsRowGroup>
					<PongSettingsRow title="Resources and support" description="Links to docs and support.">
						<template #action><PongButton variant="outline" size="small" label="View" /></template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>
		`),
	}),
};

export const MultipleGroups: Story = {
	render: (args) => ({
		components: { PongSettingsSection, PongSettingsRowGroup, PongSettingsRow, PongButton },
		setup: () => ({ args }),
		template: frame(`
			<PongSettingsSection v-bind="args">
				<PongSettingsRowGroup>
					<PongSettingsRow title="Current version" description="2.9.4" />
				</PongSettingsRowGroup>
				<PongSettingsRowGroup>
					<PongSettingsRow title="Updates" description="2.10.2 available · 3 versions behind">
						<template #action><PongButton variant="outline" size="small" label="Update" /></template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</PongSettingsSection>
		`),
	}),
	args: {
		title: 'Version and updates',
	},
};
