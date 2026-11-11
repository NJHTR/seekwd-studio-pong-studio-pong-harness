import type { StoryFn } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import PongHoverCard from './HoverCard.vue';
import PongBadge from '../PongBadge/Badge.vue';
import PongButton from '../PongButton/Button.vue';
import PongIcon from '../PongIcon/Icon.vue';
import PongTag from '../PongTag/Tag.vue';
import PongText from '../PongText/Text.vue';

export default {
	title: 'Core/HoverCard',
	component: PongHoverCard,
	argTypes: {
		openDelay: { control: 'number' },
		closeDelay: { control: 'number' },
		side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
		align: { control: 'select', options: ['start', 'center', 'end'] },
		maxWidth: { control: 'text' },
		disabled: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'A hover/focus-triggered floating card for lightweight contextual previews and structured metadata.',
			},
		},
	},
};

const WorkflowPreviewTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: { PongHoverCard, PongButton, PongIcon, PongText, PongBadge },
	template: `
		<div>
			<PongHoverCard v-bind="args">
				<template #trigger>
					<PongButton>Customer onboarding</PongButton>
				</template>
				<template #content>
					<section style="width: 360px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing--sm);">
							<div style="display: flex; gap: var(--spacing--xs); align-items: flex-start;">
								<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
									<PongText bold>Customer onboarding</PongText>
									<PongText size="small" color="text-light">Assigns setup tasks, enriches CRM data, and notifies account owners.</PongText>
								</div>
							</div>
							<PongBadge variant="secondary" size="small">Active</PongBadge>
						</header>

						<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing--2xs);">
							<div style="padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs); display:flex; flex-direction:column;">
								<PongText size="xsmall" color="text-light">Success rate</PongText>
								<PongText bold>99.2%</PongText>
							</div>
							<div style="padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs); display:flex; flex-direction:column;">
								<PongText size="xsmall" color="text-light">Avg. runtime</PongText>
								<PongText bold>42s</PongText>
							</div>
							<div style="padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs); display:flex; flex-direction:column;">
								<PongText size="xsmall" color="text-light">Runs today</PongText>
								<PongText bold>184</PongText>
							</div>
						</div>

						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small" color="text-light">Last failed node</PongText>
								<PongText size="small">HubSpot: Update company</PongText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small" color="text-light">Owner</PongText>
								<PongText size="small">Growth Ops</PongText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small" color="text-light">Last edited</PongText>
								<PongText size="small">Yesterday by Maya Chen</PongText>
							</div>
						</div>
					</section>
				</template>
			</PongHoverCard>
		</div>
	`,
});

export const Default = WorkflowPreviewTemplate.bind({});
Default.args = {
	maxWidth: '380px',
	side: 'right',
	align: 'center',
};

const EnvironmentTemplate: StoryFn = (args) => ({
	setup() {
		const isOpen = ref(false);
		return { args, isOpen };
	},
	components: { PongHoverCard, PongTag, PongText, PongBadge },
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--sm)">
			<PongText size="small" color="text-light">Open: {{ isOpen }}</PongText>
			<PongHoverCard v-model:open="isOpen" v-bind="args">
				<template #trigger>
					<PongTag text="Production" type="success" />
				</template>
				<template #content>
					<section style="width: 340px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header style="display: flex; justify-content: space-between; gap: var(--spacing--sm); align-items: flex-start;">
							<div>
								<PongText bold>Production environment</PongText>
								<PongText size="small" color="text-light">Webhook traffic is routed to this workflow version.</PongText>
							</div>
							<PongBadge variant="secondary" size="small">Healthy</PongBadge>
						</header>

						<div style="padding: var(--spacing--xs); border-radius: var(--radius--xs); background: var(--color--background--light); display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small" color="text-light">Deployed version</PongText>
								<PongText size="small" bold>v42</PongText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small" color="text-light">Last deploy</PongText>
								<PongText size="small">14 minutes ago</PongText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small" color="text-light">Deploy author</PongText>
								<PongText size="small">Maya Chen</PongText>
							</div>
						</div>

						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<PongText size="small" bold>Recent checks</PongText>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small">Credential validation</PongText>
								<PongText size="small" color="success">Passed</PongText>
							</div>
							<div style="display: flex; justify-content: space-between; gap: var(--spacing--sm);">
								<PongText size="small">Webhook response time</PongText>
								<PongText size="small">218ms p95</PongText>
							</div>
						</div>
					</section>
				</template>
			</PongHoverCard>
		</div>
	`,
});

export const ControlledEnvironment = EnvironmentTemplate.bind({});
ControlledEnvironment.args = {
	side: 'top',
	closeDelay: 600,
	maxWidth: '360px',
};

const SharedReferenceTemplate: StoryFn = (args) => ({
	setup() {
		const open = ref(false);
		const activeReference = ref<HTMLElement | undefined>();
		const activeStepId = ref('webhook');
		const steps = [
			{
				id: 'webhook',
				label: 'Webhook received',
				duration: '12ms',
				status: 'Success',
				detail: 'POST /lead-created matched the production webhook URL.',
				input: 'Lead payload, 18 fields',
				output: 'Execution started',
			},
			{
				id: 'agent',
				label: 'AI agent planned',
				duration: '5.8s',
				status: 'Success',
				detail: 'Selected CRM enrichment and owner assignment tools.',
				input: 'Lead profile + account context',
				output: '3-step action plan',
			},
			{
				id: 'http',
				label: 'HTTP request sent',
				duration: '640ms',
				status: 'Retried',
				detail: 'First HubSpot request timed out; retry succeeded.',
				input: 'Company enrichment request',
				output: 'Company size and domain',
			},
			{
				id: 'slack',
				label: 'Slack notified',
				duration: '210ms',
				status: 'Success',
				detail: 'Sent account handoff summary to #growth-ops.',
				input: 'Owner, score, next task',
				output: 'Message timestamp',
			},
		];
		const activeStep = computed(
			() => steps.find((step) => step.id === activeStepId.value) ?? steps[0],
		);

		function showCard(event: MouseEvent, stepId: string) {
			if (!(event.currentTarget instanceof HTMLElement)) return;
			activeReference.value = event.currentTarget;
			activeStepId.value = stepId;
			open.value = true;
		}

		function hideCard() {
			open.value = false;
			activeReference.value = undefined;
		}

		return { args, open, activeReference, activeStep, steps, showCard, hideCard };
	},
	components: { PongHoverCard, PongText, PongBadge },
	template: `
		<div>
			<PongHoverCard
				v-model:open="open"
				hide-trigger
				:reference="activeReference"
				v-bind="args"
			>
				<template #content>
					<section style="width: 360px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header style="display: flex; justify-content: space-between; gap: var(--spacing--sm); align-items: flex-start;">
							<div>
								<PongText bold>{{ activeStep.label }}</PongText>
								<PongText size="small" color="text-light">{{ activeStep.detail }}</PongText>
							</div>
							<PongBadge size="small" variant="secondary">{{ activeStep.status }}</PongBadge>
						</header>

						<div style="display: grid; grid-template-columns: auto 1fr; gap: var(--spacing--2xs) var(--spacing--sm);">
							<PongText size="small" color="text-light">Duration</PongText>
							<PongText size="small">{{ activeStep.duration }}</PongText>
							<PongText size="small" color="text-light">Input</PongText>
							<PongText size="small">{{ activeStep.input }}</PongText>
							<PongText size="small" color="text-light">Output</PongText>
							<PongText size="small">{{ activeStep.output }}</PongText>
						</div>
					</section>
				</template>
			</PongHoverCard>

			<div style="display: flex; gap: 1px; height: 36px;">
				<button
					v-for="(step, index) in steps"
					:key="step.id"
					type="button"
					style="border: 0; min-width: 112px; padding: 0 var(--spacing--xs); border-radius: var(--radius--sm); background: var(--color--foreground--base); color: var(--color--text--xlight); cursor: pointer;"
					@mouseenter="showCard($event, step.id)"
					@mouseleave="hideCard"
					@focus="showCard($event, step.id)"
					@blur="hideCard"
				>
					{{ index + 1 }}. {{ step.label.split(' ')[0] }}
				</button>
			</div>
		</div>
	`,
});

export const SharedReference = SharedReferenceTemplate.bind({});
SharedReference.args = {
	side: 'top',
	align: 'center',
	sideOffset: 8,
	closeDelay: 0,
	maxWidth: '380px',
};

const ScrollableTemplate: StoryFn = (args) => ({
	setup: () => ({
		args,
		executions: [
			{
				id: 1852,
				status: 'Success',
				workflowName: 'New trial signup',
				duration: '34s',
				started: '2 min ago',
			},
			{
				id: 1851,
				status: 'Success',
				workflowName: 'Demo booked',
				duration: '41s',
				started: '9 min ago',
			},
			{
				id: 1850,
				status: 'Warning',
				workflowName: 'Lead enriched',
				duration: '1m 12s',
				started: '18 min ago',
			},
			{
				id: 1849,
				status: 'Success',
				workflowName: 'Account owner assigned',
				duration: '29s',
				started: '26 min ago',
			},
			{
				id: 1848,
				status: 'Success',
				workflowName: 'Lifecycle updated',
				duration: '38s',
				started: '33 min ago',
			},
			{
				id: 1847,
				status: 'Error',
				workflowName: 'CRM sync',
				duration: '7s',
				started: '41 min ago',
			},
			{
				id: 1846,
				status: 'Success',
				workflowName: 'Welcome email queued',
				duration: '23s',
				started: '48 min ago',
			},
		],
	}),
	components: { PongHoverCard, PongButton, PongText, PongBadge },
	template: `
		<div>
			<PongHoverCard v-bind="args">
				<template #trigger>
					<PongButton>Recent executions</PongButton>
				</template>
				<template #content>
					<section style="width: 380px; padding: var(--spacing--sm); display: flex; flex-direction: column; gap: var(--spacing--sm);">
						<header>
							<PongText bold>Recent executions</PongText>
							<PongText size="small" color="text-light">Last hour of production runs for this workflow.</PongText>
						</header>

						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div v-for="execution in executions" :key="execution.id" style="display: grid; grid-template-columns: 1fr auto; gap: var(--spacing--3xs) var(--spacing--sm); padding: var(--spacing--2xs); border: var(--border); border-radius: var(--radius--xs);">
								<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
									<PongText size="small" bold>#{{ execution.id }} · {{ execution.workflowName }}</PongText>
									<PongText size="xsmall" color="text-light">Started {{ execution.started }} · Runtime {{ execution.duration }}</PongText>
								</div>
								<PongBadge size="small" variant="secondary">{{ execution.status }}</PongBadge>
							</div>
						</div>
					</section>
				</template>
			</PongHoverCard>
		</div>
	`,
});

export const ScrollableContent = ScrollableTemplate.bind({});
ScrollableContent.args = {
	maxWidth: '400px',
	maxHeight: '320px',
	enableScrolling: true,
};
