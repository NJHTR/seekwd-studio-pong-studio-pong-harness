import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

const NODE_TOOL_NAME = 'Node tool';
const WORKFLOW_TOOL_NAME = 'Workflow tool';

const NODE_INPUT_MARKER = 'node-tool-input-visible';
const NODE_OUTPUT_MARKER = 'node-tool-output-visible';
const WORKFLOW_INPUT_MARKER = 'workflow-tool-input-visible';
const WORKFLOW_OUTPUT_MARKER = 'workflow-tool-output-visible';
const LONG_SESSION_TITLE =
	'This is a long Agent session title that should be truncated to keep every column visible without horizontal scrolling';

test.use({
	capability: {
		env: {
			PONG_ENABLED_MODULES: 'agents',
			TEST_ISOLATION: 'agent-sessions-tool-run-data',
		},
	},
});

test.describe('Agent sessions', { annotation: [{ type: 'owner', description: 'Agent' }] }, () => {
	test('fits long session titles within the sessions table', async ({ pong, api }) => {
		const project = await api.projects.getMyPersonalProject();
		const agentId = `agent-${nanoid(8)}`;
		const threadId = `thread-${nanoid(8)}`;
		await pong.agentSessions.mockSession({
			projectId: project.id,
			agentId,
			threadId,
			sessionTitle: LONG_SESSION_TITLE,
			nodeTool: { name: NODE_TOOL_NAME, input: {}, output: {} },
			workflowTool: {
				name: WORKFLOW_TOOL_NAME,
				workflowId: 'workflow-id',
				executionId: 'execution-id',
			},
		});

		await pong.agentSessions.setViewportWidth(800);
		await pong.start.fromHome();
		await pong.agentSessions.gotoList(project.id, agentId);

		const tableWidth = await pong.agentSessions.getSessionTableWidth();
		const narrowTitleWidth = await pong.agentSessions.getSessionTitleWidth();
		expect(tableWidth.scrollWidth).toBe(tableWidth.clientWidth);
		expect(narrowTitleWidth.scrollWidth).toBeGreaterThan(narrowTitleWidth.clientWidth);

		await pong.agentSessions.setViewportWidth(1_400);
		await expect
			.poll(async () => (await pong.agentSessions.getSessionTitleWidth()).clientWidth)
			.toBeGreaterThan(narrowTitleWidth.clientWidth);
	});

	test('updates virtual scroll geometry when a tool row expands and collapses', async ({
		pong,
		api,
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const project = await api.projects.getMyPersonalProject();
		const agentId = `agent-${nanoid(8)}`;
		const threadId = `thread-${nanoid(8)}`;
		const nodeToolCount = 101;
		await pong.agentSessions.mockSession({
			projectId: project.id,
			agentId,
			threadId,
			nodeToolCount,
			nodeTool: {
				name: NODE_TOOL_NAME,
				input: { request: NODE_INPUT_MARKER },
				output: { response: NODE_OUTPUT_MARKER },
			},
			workflowTool: {
				name: WORKFLOW_TOOL_NAME,
				workflowId: 'workflow-id',
				executionId: 'execution-id',
			},
		});

		await pong.start.fromHome();
		await pong.agentSessions.goto(project.id, agentId, threadId);
		await expect(pong.agentSessions.getTimelineScroller()).toBeVisible();
		const trigger = pong.agentSessions.getTimelineToolTrigger(NODE_TOOL_NAME);
		await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		const collapsed = await pong.agentSessions.getTimelineGeometry();
		expect(collapsed.renderedRows).toBeLessThan(nodeToolCount);
		expect(collapsed.scrollHeight).toBeGreaterThan(collapsed.viewportHeight);
		expect(Math.abs(collapsed.nextRowOffset - collapsed.rowHeight)).toBeLessThanOrEqual(1);

		await trigger.click();
		await expect(trigger).toHaveAttribute('aria-expanded', 'true');
		await expect
			.poll(async () => {
				const expanded = await pong.agentSessions.getTimelineGeometry();
				const growth = expanded.rowHeight - collapsed.rowHeight;
				return {
					expanded: growth > 1,
					rowsRemainAdjacent: Math.abs(expanded.nextRowOffset - expanded.rowHeight) <= 1,
					virtualHeightTracksRow:
						Math.abs(expanded.virtualHeight - collapsed.virtualHeight - growth) <= 1,
					scrollHeightTracksRow:
						Math.abs(expanded.scrollHeight - collapsed.scrollHeight - growth) <= 1,
				};
			})
			.toEqual({
				expanded: true,
				rowsRemainAdjacent: true,
				virtualHeightTracksRow: true,
				scrollHeightTracksRow: true,
			});

		await trigger.click();
		await expect(trigger).toHaveAttribute('aria-expanded', 'false');
		await expect
			.poll(async () => {
				const restored = await pong.agentSessions.getTimelineGeometry();
				return {
					rowHeight: Math.abs(restored.rowHeight - collapsed.rowHeight) <= 1,
					rowsRemainAdjacent: Math.abs(restored.nextRowOffset - restored.rowHeight) <= 1,
					virtualHeight: Math.abs(restored.virtualHeight - collapsed.virtualHeight) <= 1,
					scrollHeight: Math.abs(restored.scrollHeight - collapsed.scrollHeight) <= 1,
				};
			})
			.toEqual({
				rowHeight: true,
				rowsRemainAdjacent: true,
				virtualHeight: true,
				scrollHeight: true,
			});
	});

	test('shows input and output data for node and workflow tools', async ({ pong, api }) => {
		const project = await api.projects.getMyPersonalProject();
		const agentId = `agent-${nanoid(8)}`;
		const threadId = `thread-${nanoid(8)}`;
		await pong.agentSessions.mockSession({
			projectId: project.id,
			agentId,
			threadId,
			nodeTool: {
				name: NODE_TOOL_NAME,
				input: { request: NODE_INPUT_MARKER },
				output: { response: NODE_OUTPUT_MARKER },
			},
			workflowTool: {
				name: WORKFLOW_TOOL_NAME,
				workflowId: 'workflow-id',
				executionId: 'execution-id',
				input: { request: WORKFLOW_INPUT_MARKER },
				output: {
					executionId: 'execution-id',
					status: 'success',
					data: { 'Last node': [{ value: WORKFLOW_OUTPUT_MARKER }] },
				},
			},
		});

		await pong.start.fromHome();
		await pong.agentSessions.goto(project.id, agentId, threadId);

		const nodeTrigger = pong.agentSessions.getTimelineToolTrigger(NODE_TOOL_NAME);
		await expect(nodeTrigger).toHaveAttribute('aria-expanded', 'false');
		await nodeTrigger.click();
		await expect(nodeTrigger).toHaveAttribute('aria-expanded', 'true');
		await expect(pong.agentSessions.getTimelineToolInput(NODE_TOOL_NAME)).toContainText(
			NODE_INPUT_MARKER,
		);
		await expect(pong.agentSessions.getTimelineToolOutput(NODE_TOOL_NAME)).toContainText(
			NODE_OUTPUT_MARKER,
		);

		const workflowTrigger = pong.agentSessions.getTimelineToolTrigger(WORKFLOW_TOOL_NAME);
		await expect(workflowTrigger).toHaveAttribute('aria-expanded', 'false');
		await workflowTrigger.click();
		await expect(workflowTrigger).toHaveAttribute('aria-expanded', 'true');
		await expect(pong.agentSessions.getTimelineToolInput(WORKFLOW_TOOL_NAME)).toContainText(
			WORKFLOW_INPUT_MARKER,
		);
		await expect(pong.agentSessions.getTimelineToolOutput(WORKFLOW_TOOL_NAME)).toContainText(
			WORKFLOW_OUTPUT_MARKER,
		);
		await expect(pong.agentSessions.getTimelineToolOutput(WORKFLOW_TOOL_NAME)).toContainText(
			'Last node',
		);
	});
});
