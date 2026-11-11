import type { StoryFn } from '@storybook/vue3-vite';

import PongStepper from './Stepper.vue';
import PongButton from '../PongButton/Button.vue';
import PongCallout from '../PongCallout/Callout.vue';
import PongText from '../PongText/Text.vue';

interface StepperStep {
	id: string;
	title: string;
	description?: string;
}

interface Args {
	steps: StepperStep[];
	showIndex: boolean;
}

export default {
	title: 'Core/Stepper',
	component: PongStepper,
	argTypes: {
		steps: {
			control: {
				type: 'object',
			},
			description: 'Ordered list of steps to render.',
		},
		showIndex: {
			control: {
				type: 'boolean',
			},
			description: 'Show numbered indicators instead of simple dots.',
		},
	},
	parameters: {
		docs: {
			description: {
				component: 'A horizontal stepper for guiding users through a short multi-step process.',
			},
		},
	},
};

const installDetails: Record<string, { body: string; action?: string; command?: string }> = {
	account: {
		body: 'Create your pong account, choose a workspace name, and invite teammates who should help build automations.',
		action: 'Open signup',
	},
	install: {
		body: 'Install pong locally with npm, or use Docker if you prefer an isolated runtime.',
		command: 'npm install pong -g',
	},
	connect: {
		body: 'Add credentials for the apps you want to automate, then test each connection before building your first workflow.',
		action: 'Add credentials',
	},
	launch: {
		body: 'Run a final manual test, activate the workflow, and monitor the first production executions.',
		action: 'Activate workflow',
	},
};

const Template: StoryFn<Args> = (args, { argTypes }) => ({
	setup: () => ({ args, installDetails }),
	props: Object.keys(argTypes),
	components: {
		PongButton,
		PongCallout,
		PongStepper,
		PongText,
	},
	template: `
		<div style="max-width: 1100px;">
			<pong-stepper v-bind="args">
				<template #default="{ step }">
					<div style="margin-top: var(--spacing--sm); padding-right: var(--spacing--md);">
						<pong-text color="text-light" size="small">
							{{ installDetails[step.id].body }}
						</pong-text>

						<pong-callout
							v-if="installDetails[step.id].command"
							style="margin-top: var(--spacing--sm);"
							theme="secondary"
							icon="terminal"
						>
							<code>{{ installDetails[step.id].command }}</code>
						</pong-callout>

						<pong-button
							v-if="installDetails[step.id].action"
							style="margin-top: var(--spacing--sm);"
							size="small"
							variant="outline"
						>
							{{ installDetails[step.id].action }}
						</pong-button>
					</div>
				</template>
			</pong-stepper>
		</div>
	`,
});

export const Default = Template.bind({});
Default.args = {
	showIndex: true,
	steps: [
		{
			id: 'account',
			title: 'Create workspace',
			description: 'Set up your team',
		},
		{
			id: 'install',
			title: 'Install pong',
			description: 'Prepare your environment',
		},
		{
			id: 'connect',
			title: 'Connect apps',
			description: 'Add credentials',
		},
		{
			id: 'launch',
			title: 'Go live',
			description: 'Activate your workflow',
		},
	],
};

export const WithoutIndex = Template.bind({});
WithoutIndex.args = {
	...Default.args,
	showIndex: false,
};
