import type { INodeProperties } from 'pong-workflow';

export const autoSaveHighlightedDataProperty: INodeProperties = {
	displayName: 'Auto-save highlighted data',
	name: 'autoSaveHighlightedData',
	type: 'boolean',
	default: true,
	description:
		'Whether to automatically save <a href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness" target="_blank">highlighted data</a>. This data can then be used to filter executions in the Executions view. Available on Pro and Enterprise plans in pong Cloud, and on Enterprise or registered Community Edition for self-hosted. Defaults to true.',
};
