import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	config: {
		settings: {
			previewMode: true,
		},
	},
};

// Simple workflow structures for testing
const oldWorkflow = {
	id: 'old-workflow-id',
	name: 'Test Workflow - Before',
	nodes: [
		{
			parameters: {},
			id: '1',
			name: 'Manual Trigger',
			type: 'pong-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
		},
		{
			parameters: {},
			id: '2',
			name: 'Set',
			type: 'pong-nodes-base.set',
			typeVersion: 1,
			position: [450, 300],
		},
	],
	connections: {
		'Manual Trigger': {
			main: [
				[
					{
						node: 'Set',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};

const newWorkflow = {
	id: 'new-workflow-id',
	name: 'Test Workflow - After',
	nodes: [
		{
			parameters: {},
			id: '1',
			name: 'Manual Trigger',
			type: 'pong-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [250, 300],
		},
		{
			parameters: {
				options: {
					keepOnlySet: true,
				},
			},
			id: '2',
			name: 'Set',
			type: 'pong-nodes-base.set',
			typeVersion: 1,
			position: [450, 300],
		},
		{
			parameters: {},
			id: '3',
			name: 'Code',
			type: 'pong-nodes-base.code',
			typeVersion: 1,
			position: [650, 300],
		},
	],
	connections: {
		'Manual Trigger': {
			main: [
				[
					{
						node: 'Set',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		Set: {
			main: [
				[
					{
						node: 'Code',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
};

test.describe(
	'Workflow Diff Demo',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		test('shows waiting state initially', async ({ pong }) => {
			await pong.demo.gotoDiff();
			// Verify the waiting state message is shown
			await expect(pong.demo.getWaitingMessage()).toBeVisible();
		});

		test('renders diff view when receiving workflow data via postMessage', async ({ pong }) => {
			await pong.demo.gotoDiff();

			// Verify the waiting state is initially shown
			await expect(pong.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with workflow data
			await pong.demo.openDiff({ oldWorkflow, newWorkflow });

			// Wait for the diff view to appear - the waiting message should disappear
			await expect(pong.demo.getWaitingMessage()).toBeHidden();

			// The workflow name should appear in the header
			await expect(pong.demo.getDiffHeading()).toBeVisible();

			// The Changes button should be visible (part of the diff view header)
			await expect(pong.demo.getChangesButton()).toBeVisible();
		});

		test('renders diff view with only new workflow (creation scenario)', async ({ pong }) => {
			await pong.demo.gotoDiff();

			// Wait for the page to be ready (component mounted with event listener active)
			await expect(pong.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with only newWorkflow (simulating workflow creation)
			await pong.demo.openDiff({ newWorkflow });

			// Wait for the diff view to appear
			await expect(pong.demo.getWaitingMessage()).toBeHidden();

			// The workflow name from newWorkflow should appear
			await expect(pong.demo.getDiffHeading('Test Workflow - After')).toBeVisible();
		});

		test('renders diff view with only old workflow (deletion scenario)', async ({ pong }) => {
			await pong.demo.gotoDiff();

			// Wait for the page to be ready (component mounted with event listener active)
			await expect(pong.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with only oldWorkflow (simulating workflow deletion)
			await pong.demo.openDiff({ oldWorkflow });

			// Wait for the diff view to appear
			await expect(pong.demo.getWaitingMessage()).toBeHidden();

			// The workflow name from oldWorkflow should appear
			await expect(pong.demo.getDiffHeading('Test Workflow - Before')).toBeVisible();
		});

		test('applies tidy up when tidyUp option is true', async ({ pong }) => {
			await pong.demo.gotoDiff();

			// Wait for the page to be ready (component mounted with event listener active)
			await expect(pong.demo.getWaitingMessage()).toBeVisible();

			// Send postMessage with tidyUp: true
			await pong.demo.openDiff({ oldWorkflow, newWorkflow, tidyUp: true });

			// Wait for the diff view to appear
			await expect(pong.demo.getWaitingMessage()).toBeHidden();

			// The diff view should render (tidyUp affects node positioning but view should still render)
			await expect(pong.demo.getDiffHeading()).toBeVisible();

			// The Changes button should be visible (part of the diff view header)
			await expect(pong.demo.getChangesButton()).toBeVisible();
		});

		test('ignores malformed postMessage data', async ({ pong }) => {
			await pong.demo.gotoDiff();

			// Verify initial waiting state
			await expect(pong.demo.getWaitingMessage()).toBeVisible();

			// Send malformed message
			await pong.demo.postRawMessage('not valid json {{{');

			// Waiting state should still be shown
			await expect(pong.demo.getWaitingMessage()).toBeVisible();
		});

		test('ignores non-openDiff commands', async ({ pong }) => {
			await pong.demo.gotoDiff();

			// Verify initial waiting state
			await expect(pong.demo.getWaitingMessage()).toBeVisible();

			// Send a different command
			await pong.demo.postRawMessage(JSON.stringify({ command: 'someOtherCommand', data: {} }));

			// Waiting state should still be shown
			await expect(pong.demo.getWaitingMessage()).toBeVisible();
		});

		test('can override theme to dark', async ({ pong }) => {
			await pong.demo.gotoDiff({ theme: 'dark' });
			await expect(pong.demo.getBody()).toHaveAttribute('data-theme', 'dark');
		});

		test('can override theme to light', async ({ pong }) => {
			await pong.demo.gotoDiff({ theme: 'light' });
			await expect(pong.demo.getBody()).toHaveAttribute('data-theme', 'light');
		});
	},
);
