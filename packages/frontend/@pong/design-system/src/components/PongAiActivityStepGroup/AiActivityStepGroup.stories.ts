import type { StoryFn } from '@storybook/vue3-vite';
import { defineComponent } from 'vue';

import './AiActivityStepGroup.stories.scss';

import PongAiActivityStep from '../PongAiActivityStep';
import PongAiActivityStepButton from '../PongAiActivityStepButton';
import PongAiActivityStepChevron from '../PongAiActivityStepChevron';
import PongAiActivityStepResultSection from '../PongAiActivityStepResultSection';
import PongChatInput from '../PongChatInput';
import PongIcon from '../PongIcon';
import PongAiActivityStepGroup from './AiActivityStepGroup.vue';

export default {
	title: 'Areas/Assistant/AiActivityStep',
	component: PongAiActivityStepGroup,
	parameters: {
		docs: {
			description: {
				component:
					'AI activity primitives for rendering generic activity rows, collapsible groups, and shared activity controls.',
			},
		},
	},
};

const wrapperStyle =
	'max-width: 720px; padding: var(--spacing--m); display: flex; flex-direction: column; gap: var(--spacing--2xs);';

const steps = [
	{
		id: 'nodes-search',
		label: 'Search nodes',
		toolName: 'workflow_builder_nodes',
		args: { action: 'search', query: 'Slack trigger', limit: 5 },
		result: {
			nodes: [
				{ name: 'Slack Trigger', type: 'pong-nodes-base.slackTrigger' },
				{ name: 'Slack', type: 'pong-nodes-base.slack' },
			],
		},
	},
	{
		id: 'workflow-code',
		label: 'Generated workflow code',
		toolName: 'get_workflow_as_code',
		args: {},
		result: { code: 'const workflow = {\n  nodes: [scheduleTrigger, slackMessage],\n};' },
	},
	{
		id: 'workflows-list',
		label: 'Listed workflows',
		toolName: 'list_workflows',
		args: {},
		result: {
			workflows: [
				{ name: 'Daily lead sync', active: true, updated: 'Today' },
				{ name: 'Slack incident alert', active: false, updated: 'Yesterday' },
			],
		},
	},
	{
		id: 'failed',
		label: 'Run command',
		error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
		toolName: 'terminal',
		args: { command: 'pnpm typecheck' },
	},
];

const baseResultTextStyle = [
	'font-family: monospace',
	'line-height: var(--line-height--xl)',
	'white-space: pre-wrap',
	'word-break: break-word',
	'margin: 0',
	'color: var(--color--text--tint-1)',
];

const jsonTextStyle = [...baseResultTextStyle, 'font-size: var(--font-size--xs)'].join('; ');
const codeTextStyle = [
	...baseResultTextStyle,
	'font-size: var(--font-size--2xs)',
	'padding: var(--spacing--xs)',
].join('; ');

const StoryToolResultJson = defineComponent({
	components: { PongAiActivityStepResultSection },
	props: {
		value: { type: null, required: true },
	},
	setup() {
		return { jsonTextStyle };
	},
	computed: {
		json(): string {
			return JSON.stringify(this.value, null, 2);
		},
	},
	template: `
		<pong-ai-activity-step-result-section>
			<pre :style="jsonTextStyle">{{ json }}</pre>
		</pong-ai-activity-step-result-section>
	`,
});

const StoryToolResultRenderer = defineComponent({
	components: { PongAiActivityStepResultSection, StoryToolResultJson },
	props: {
		result: { type: null, required: true },
		toolName: { type: String, required: true },
		toolArgs: { type: Object, default: undefined },
	},
	setup() {
		return { codeTextStyle };
	},
	computed: {
		code(): string | undefined {
			const result = this.result as { code?: unknown };
			return this.toolName === 'get_workflow_as_code'
				? typeof result.code === 'string'
					? result.code
					: undefined
				: undefined;
		},
	},
	template: `
		<pong-ai-activity-step-result-section v-if="code">
			<pre :style="codeTextStyle">{{ code }}</pre>
		</pong-ai-activity-step-result-section>
		<story-tool-result-json v-else :value="result" />
	`,
});

const storyComponents = {
	PongAiActivityStepResultSection,
	ToolResultJson: StoryToolResultJson,
	ToolResultRenderer: StoryToolResultRenderer,
};

const slotStyles = '';

export const Default: StoryFn = () => ({
	components: { PongAiActivityStepGroup, PongAiActivityStep, ...storyComponents },
	setup() {
		return { steps };
	},
	template: `
		<style>${slotStyles}</style>
		<div style="${wrapperStyle}">
			<pong-ai-activity-step-group label="4 activity steps" size="medium" loading>
				<template v-for="step in steps" :key="step.id">
					<pong-ai-activity-step
						:label="step.label"
						:loading="step.loading"
						:error="step.error"
					>
						<tool-result-json v-if="step.args" :value="step.args" />
						<tool-result-renderer
							v-if="step.result !== undefined"
							:result="step.result"
							:tool-name="step.toolName"
							:tool-args="step.args"
						/>
					</pong-ai-activity-step>
				</template>
			</pong-ai-activity-step-group>
		</div>
	`,
});

export const BackgroundJobs: StoryFn = (args) => ({
	components: { PongAiActivityStepGroup, PongChatInput, PongIcon },
	setup: () => ({ args }),
	data: () => ({
		message: '',
		jobs: [
			{ title: 'Sub-agent — Berlin weather, week 1', waiting: false },
			{ title: 'Sub-agent — Berlin weather, week 2', waiting: false },
			{ title: "Workflow (Wait node) — waiting for tomorrow's forecast refresh", waiting: true },
		],
	}),
	template: `
		<div style="width: 32rem; max-width: 100%">
			<pong-chat-input v-model="message" placeholder="Message Research Assistant..." @submit="message = ''">
				<template #leading>
					<div class="background-jobs-story">
						<pong-ai-activity-step-group v-bind="args">
							<template #prefix><pong-icon icon="loader-circle" spin size="small" aria-hidden="true" class="job-spinner" style="color: var(--color--primary)" /></template>
							<template #header-trailing><span aria-live="off" style="font-variant-numeric: tabular-nums; color: var(--text-color--subtler)">0:42</span></template>
							<div style="padding: var(--spacing--sm); border-bottom: var(--border); border-bottom-style: dashed;">
								<ul style="list-style: none; padding: 0; margin: 0 0 var(--spacing--xs); max-height: 20vh; overflow-y: auto">
									<li v-for="job in jobs" :key="job.title" style="display: flex; align-items: flex-start; gap: var(--spacing--2xs); padding-block: var(--spacing--3xs); font-size: var(--font-size--sm); line-height: var(--line-height--lg); color: var(--text-color--subtle); overflow-wrap: anywhere">
										<pong-icon :icon="job.waiting ? 'circle' : 'loader-circle'" :spin="!job.waiting" size="small" aria-hidden="true" :class="job.waiting ? 'waiting' : 'job-spinner'" :style="{ flexShrink: 0, color: job.waiting ? 'var(--text-color--subtler)' : 'var(--color--primary)' }" />
										<span>{{ job.title }}</span>
									</li>
								</ul>
								<a href="#session-trace" style="display: inline-flex; align-items: center; gap: var(--spacing--2xs); font-size: var(--font-size--sm); color: var(--text-color); text-decoration: underline"><pong-icon icon="arrow-right" size="small" />View trace</a>
							</div>
						</pong-ai-activity-step-group>
					</div>
				</template>
			</pong-chat-input>
		</div>
	`,
});
BackgroundJobs.args = {
	label: 'Running 3 background tasks',
	fullWidth: true,
	contentPosition: 'above',
};

export const LongBackgroundJobHeader = BackgroundJobs.bind({});
LongBackgroundJobHeader.args = {
	...BackgroundJobs.args,
	label: 'Running background tasks to check outstanding invoices and reply to requests',
};

const Template: StoryFn = (args) => ({
	components: { PongAiActivityStep, ...storyComponents },
	setup: () => ({ args, jsonTextStyle }),
	template: `
		<style>${slotStyles}</style>
		<div style="max-width: 720px; padding: var(--spacing--m);">
			<pong-ai-activity-step
				v-if="args.type === 'reasoning'"
				:label="args.label"
				:loading="args.loading"
			>
				<pre :style="jsonTextStyle">{{ args.result.content }}</pre>
			</pong-ai-activity-step>
			<pong-ai-activity-step v-else v-bind="args">
				<tool-result-renderer
					:result="args.result"
					:tool-name="args.toolName ?? 'unknown'"
					:tool-args="args.toolArgs"
				/>
			</pong-ai-activity-step>
		</div>
	`,
});

export const NodeSearch = Template.bind({});
NodeSearch.args = {
	label: 'Search nodes',
	toolName: 'workflow_builder_nodes',
	toolArgs: { action: 'search', query: 'Slack trigger', limit: 5 },
	result: {
		nodes: [
			{ name: 'Slack Trigger', type: 'pong-nodes-base.slackTrigger' },
			{ name: 'Slack', type: 'pong-nodes-base.slack' },
		],
	},
};

export const Reasoning = Template.bind({});
Reasoning.args = {
	label: 'Reasoning',
	loading: true,
	type: 'reasoning',
	result: { content: 'Thinking through the workflow shape before creating nodes.' },
};

export const CodeResult = Template.bind({});
CodeResult.args = {
	label: 'Generated workflow code',
	toolName: 'get_workflow_as_code',
	toolArgs: {},
	result: {
		code: `const workflow = {
  nodes: [
    { name: 'Schedule Trigger', type: 'pong-nodes-base.scheduleTrigger' },
    { name: 'Post Slack Message', type: 'pong-nodes-base.slack' },
  ],
};`,
	},
};

export const TableResult = Template.bind({});
TableResult.args = {
	label: 'Listed workflows',
	toolName: 'list_workflows',
	toolArgs: {},
	result: {
		workflows: [
			{ name: 'Daily lead sync', active: true, updated: 'Today' },
			{ name: 'Slack incident alert', active: false, updated: 'Yesterday' },
			{ name: 'Weekly digest', active: true, updated: 'Last week' },
		],
	},
};

export const TextResult = Template.bind({});
TextResult.args = {
	label: 'Fetched page content',
	toolName: 'docs',
	result: {
		content: [
			{
				type: 'text',
				text: 'Slack Trigger node\n\nStarts a workflow when a new message is posted to a selected channel.',
			},
		],
	},
};

export const ImageResult = Template.bind({});
ImageResult.args = {
	label: 'Generated preview image',
	toolName: 'image-generator',
	result: {
		content: [
			{
				type: 'image',
				mimeType: 'image/svg+xml',
				data: btoa(`
			<svg xmlns="http://www.w3.org/2000/svg" width="360" height="160" viewBox="0 0 360 160">
				<rect width="360" height="160" rx="12" fill="#f6f7fb"/>
				<circle cx="80" cy="80" r="28" fill="#ff6d5a"/>
				<rect x="132" y="55" width="150" height="12" rx="6" fill="#8b90a0"/>
				<rect x="132" y="82" width="100" height="12" rx="6" fill="#b5bac8"/>
			</svg>
		`),
			},
		],
	},
};

export const FileResult = Template.bind({});
FileResult.args = {
	label: 'Fetched PDF file',
	toolName: 'files',
	result: {
		content: [
			{
				type: 'file-data',
				mediaType: 'application/pdf',
				data: 'JVBERi0xLjQKJcfs',
			},
		],
	},
};

export const FailedActivity = Template.bind({});
FailedActivity.args = {
	label: 'Run command',
	error: 'Command failed with exit code 2. Check the TypeScript errors before continuing.',
	toolName: 'terminal',
	result: { command: 'pnpm typecheck' },
};

export const StepButton: StoryFn = () => ({
	components: { PongAiActivityStepButton, PongAiActivityStepChevron },
	data() {
		return { open: false };
	},
	template: `
		<div style="${wrapperStyle}">
			<pong-ai-activity-step-button @click="open = !open">
				Searching available nodes
				<template #suffix>
					<pong-ai-activity-step-chevron :open="open" />
				</template>
			</pong-ai-activity-step-button>
			<pong-ai-activity-step-button loading>
				Running activity
				<template #suffix>
					<pong-ai-activity-step-chevron :open="false" />
				</template>
			</pong-ai-activity-step-button>
		</div>
	`,
});
