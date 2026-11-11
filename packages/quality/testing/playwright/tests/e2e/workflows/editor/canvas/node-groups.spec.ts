import { nanoid } from 'nanoid';

import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';

const FIXTURE = 'Canvas-node-groups-fixture.json';
const IF_FIXTURE = 'Canvas-node-groups-if-fixture.json';
const PERSISTED_FIXTURE = 'Canvas-node-groups-persisted-fixture.json';
const STICKY_FIXTURE = 'Canvas-node-groups-sticky-fixture.json';
const TRIGGER = 'When clicking ‘Execute workflow’';
const DEFAULT_GROUP_TITLE = 'Group 1';
const PERSISTED_GROUP_TITLE = 'Persisted group';
const SET_A_NODE_ID = 'b2e0f1a8-5b8f-4b2b-a0c2-9b3e2d2a0002';
const SET_B_NODE_ID = 'c3f1a2b8-6c9f-4c2c-b0d2-aa4f3e3b0003';
const STICKY_FIXTURE_SET_A_ID = 'a1b2c3d4-0000-4000-8000-000000000002';
const STICKY_FIXTURE_SET_B_ID = 'a1b2c3d4-0000-4000-8000-000000000003';
const STICKY_FIXTURE_STICKY_ID = 'a1b2c3d4-0000-4000-8000-000000000004';
const AUTOSAVE_TIMEOUT = 5_000;

// PERSISTED_FIXTURE has 4 workflow nodes but one group containing 2 of them.
// Groups load collapsed by default, so only 2 canvas nodes render (trigger + Set C).
const VISIBLE_NODES_AFTER_COLLAPSED_LOAD = 2;

test.describe(
	'Canvas node groups',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		let workflowId: string;

		test.beforeEach(async ({ pong }) => {
			const importResult = await pong.start.fromImportedWorkflow(FIXTURE);
			workflowId = importResult.workflowId;
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.deselectAll();
		});

		test('shows the Group toolbar above a valid selection and creates an overlay on click', async ({
			pong,
		}) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);

			await expect(pong.canvas.selectionToolbar.groupButton()).toBeVisible();
			await expect(pong.canvas.selectionToolbar.extractSubWorkflowButton()).toBeVisible();
			await pong.canvas.selectionToolbar.groupButton().click();

			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await expect(pong.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
		});

		test('expands the group frame when a member node is dragged farther away', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();

			const before = await pong.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);
			await pong.canvas.dragNodeToRelativePosition('Set B', 200, 0);
			const after = await pong.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);

			expect(after.width).toBeGreaterThan(before.width);
		});

		test('drags the group when grabbing the title bar beside a short name', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();

			const before = await pong.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);
			// Grab the empty space to the right of the (short) name, not over the name input.
			await pong.canvas.dragNodeGroupFromTitleBar(DEFAULT_GROUP_TITLE, 120, 80);
			const after = await pong.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);

			expect(after.x).toBeGreaterThan(before.x);
			expect(after.y).toBeGreaterThan(before.y);
		});

		test('commits a new title on Enter and reverts on Escape', async ({ pong }) => {
			const renamed = `Renamed ${nanoid(6)}`;
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();

			await pong.canvas.editNodeGroupTitle(DEFAULT_GROUP_TITLE, renamed, 'enter');
			await expect(pong.canvas.getNodeGroupTitle(renamed)).toBeVisible();

			await pong.canvas.cancelNodeGroupTitleEdit(renamed);
			await expect(pong.canvas.getNodeGroupTitle(renamed)).toBeVisible();

			const blurredTitle = `Blurred ${nanoid(6)}`;
			await pong.canvas.editNodeGroupTitle(renamed, blurredTitle, 'blur');
			await expect(pong.canvas.getNodeGroupTitle(blurredTitle)).toBeVisible();
		});

		test('removes the overlay when the group ungroup button is clicked', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();

			await pong.canvas.getNodeGroupHeader(DEFAULT_GROUP_TITLE).hover();
			await expect(pong.canvas.groupUngroupButton(DEFAULT_GROUP_TITLE)).toBeVisible();
			await pong.canvas.groupUngroupButton(DEFAULT_GROUP_TITLE).click();

			await expect(pong.canvas.getNodeGroups()).toHaveCount(0);
			await expect(pong.canvas.nodeByName('Set A')).toBeVisible();
			await expect(pong.canvas.nodeByName('Set B')).toBeVisible();
			await expect(pong.canvas.connectionBetweenNodes('Set A', 'Set B')).toHaveCount(1);
		});

		test('hides the Group action when nodes inside an existing group are selected', async ({
			pong,
		}) => {
			await pong.canvas.selectNodes(['Set A', 'Set B', 'Set C']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();

			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await expect(pong.canvas.selectionToolbar.groupButton()).toBeHidden();
			await expect(pong.canvas.selectionToolbar.extractSubWorkflowButton()).toBeVisible();
		});

		test('hides the toolbar for invalid selections', async ({ pong }) => {
			await pong.canvas.nodeByName('Set A').click();
			await expect(pong.canvas.selectionToolbar.root()).toBeHidden();

			await pong.canvas.deselectAll();
			await pong.canvas.selectNodes([TRIGGER, 'Set A']);
			await expect(pong.canvas.selectionToolbar.root()).toBeHidden();
		});

		test('keeps a single-node group when one of two members is deleted', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);

			await pong.canvas.deleteNodeFromContextMenu('Set B');
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await expect(pong.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
		});

		test('removes the group when the last member is deleted', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);

			await pong.canvas.deleteNodeFromContextMenu('Set B');
			await pong.canvas.deleteNodeFromContextMenu('Set A');
			await expect(pong.canvas.getNodeGroups()).toHaveCount(0);
		});

		test('keeps the group when one of three members is deleted', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B', 'Set C']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);

			await pong.canvas.deleteNodeFromContextMenu('Set C');
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
		});

		test('includes nodeGroups in the autosave PATCH payload', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);

			const saveResponsePromise = pong.canvas.waitForSaveWorkflowCompleted({
				timeout: AUTOSAVE_TIMEOUT,
			});
			await pong.canvas.selectionToolbar.groupButton().click();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);

			const saveResponse = await saveResponsePromise;
			expect(saveResponse.request().method()).toBe('PATCH');

			const requestBody = saveResponse.request().postDataJSON() as {
				nodeGroups?: Array<{ id: string; name: string; nodeIds: string[] }>;
			};

			expect(requestBody.nodeGroups).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: DEFAULT_GROUP_TITLE,
						nodeIds: [SET_A_NODE_ID, SET_B_NODE_ID],
					}),
				]),
			);
		});

		test('persists groups after autosave and reload', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);

			const saveResponsePromise = pong.canvas.waitForSaveWorkflowCompleted({
				timeout: AUTOSAVE_TIMEOUT,
			});
			await pong.canvas.selectionToolbar.groupButton().click();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);

			await saveResponsePromise;

			const persisted = await pong.api.workflows.getWorkflow(workflowId);
			expect(persisted.nodeGroups).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: DEFAULT_GROUP_TITLE,
						nodeIds: [SET_A_NODE_ID, SET_B_NODE_ID],
					}),
				]),
			);

			await pong.page.reload();
			// Creating a group persists its expand state, so it reloads expanded with all nodes visible.
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await expect(pong.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
			await expect(pong.canvas.getNodeGroupFrame(DEFAULT_GROUP_TITLE)).toBeVisible();
		});

		test('blocks Convert to sub-workflow for selections that include a trigger', async ({
			pong,
		}) => {
			await pong.canvas.selectNodes([TRIGGER, 'Set A']);
			await expect(pong.canvas.selectionToolbar.root()).toBeHidden();
		});

		test('auto-extends the group when a new connection would otherwise invalidate it', async ({
			pong,
		}) => {
			await pong.canvas.selectNodes(['Set B', 'Set C']);
			await pong.canvas.selectionToolbar.groupButton().click();
			await pong.canvas.deselectAll();
			await expect(pong.canvas.getNodeGroupByTitle(DEFAULT_GROUP_TITLE)).toBeVisible();

			const before = await pong.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);

			await pong.canvas.connectNodesByDrag('Set A', 'Set C');

			await expect(
				pong.notifications.getNotificationByTitle(`'${DEFAULT_GROUP_TITLE}' extended`),
			).toBeVisible();
			await expect(pong.canvas.connectionBetweenNodes('Set A', 'Set C')).toHaveCount(1);

			const after = await pong.canvas.getNodeGroupBoundingBox(DEFAULT_GROUP_TITLE);
			expect(after.width).toBeGreaterThan(before.width);
		});
	},
);

test.describe(
	'Canvas node groups with sticky notes',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow(STICKY_FIXTURE);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.canvas.sticky.getStickies()).toHaveCount(2);
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.deselectAll();
		});

		const groupNote = (pong: pongPage) => pong.canvas.sticky.getStickyByContent('Group note');

		async function createGroupWithSticky(pong: pongPage) {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await groupNote(pong).click({ modifiers: ['ControlOrMeta'] });
			await pong.canvas.selectionToolbar.groupButton().click();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await pong.canvas.deselectAll();
		}

		test('creates a group that includes the sticky and sizes the frame around it', async ({
			pong,
		}) => {
			await createGroupWithSticky(pong);

			const frame = await pong.canvas.getNodeGroupFrameBoundingBox(DEFAULT_GROUP_TITLE);
			const sticky = await pong.canvas.sticky.getStickyBoundingBox('Group note');

			expect(frame.x).toBeLessThanOrEqual(sticky.x);
			expect(frame.y).toBeLessThanOrEqual(sticky.y);
			expect(frame.x + frame.width).toBeGreaterThanOrEqual(sticky.x + sticky.width);
			expect(frame.y + frame.height).toBeGreaterThanOrEqual(sticky.y + sticky.height);
		});

		test('does not offer the Group action for sticky-only selections', async ({ pong }) => {
			await groupNote(pong).click();
			await pong.canvas.sticky
				.getStickyByContent('Far note')
				.click({ modifiers: ['ControlOrMeta'] });

			await expect(pong.canvas.selectionToolbar.root()).toBeHidden();
		});

		test('persists the sticky as a group member in the autosave PATCH payload', async ({ pong }) => {
			await pong.canvas.selectNodes(['Set A', 'Set B']);
			await groupNote(pong).click({ modifiers: ['ControlOrMeta'] });

			const saveResponsePromise = pong.canvas.waitForSaveWorkflowCompleted({
				timeout: AUTOSAVE_TIMEOUT,
			});
			await pong.canvas.selectionToolbar.groupButton().click();
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);

			const saveResponse = await saveResponsePromise;
			const requestBody = saveResponse.request().postDataJSON() as {
				nodeGroups?: Array<{ id: string; name: string; nodeIds: string[] }>;
			};

			expect(requestBody.nodeGroups).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: DEFAULT_GROUP_TITLE,
						nodeIds: [STICKY_FIXTURE_SET_A_ID, STICKY_FIXTURE_SET_B_ID, STICKY_FIXTURE_STICKY_ID],
					}),
				]),
			);
		});

		test('hides the sticky while the group is collapsed and restores it on expand', async ({
			pong,
		}) => {
			await createGroupWithSticky(pong);

			await pong.canvas.toggleNodeGroup(DEFAULT_GROUP_TITLE);
			await expect(groupNote(pong)).toBeHidden();
			// The free sticky is unaffected by the collapse.
			await expect(pong.canvas.sticky.getStickyByContent('Far note')).toBeVisible();

			await pong.canvas.toggleNodeGroup(DEFAULT_GROUP_TITLE);
			await expect(groupNote(pong)).toBeVisible();
		});

		test('moves the sticky along when the group is dragged by its title bar', async ({ pong }) => {
			await createGroupWithSticky(pong);

			const before = await pong.canvas.sticky.getStickyBoundingBox('Group note');
			await pong.canvas.dragNodeGroupFromTitleBar(DEFAULT_GROUP_TITLE, 120, 80);
			const after = await pong.canvas.sticky.getStickyBoundingBox('Group note');

			expect(after.x).toBeGreaterThan(before.x);
			expect(after.y).toBeGreaterThan(before.y);
		});

		test('keeps a sticky-only group and saves it when the last connectable member is deleted', async ({
			pong,
		}) => {
			// Deliberate edge case: groups are not auto-dissolved when they
			// degenerate to sticky-only members — they must keep rendering and
			// keep saving (the backend tolerates sticky-only groups as data).
			await createGroupWithSticky(pong);

			await pong.canvas.deleteNodeFromContextMenu('Set A');
			const saveResponsePromise = pong.canvas.waitForSaveWorkflowCompleted({
				timeout: AUTOSAVE_TIMEOUT,
			});
			await pong.canvas.deleteNodeFromContextMenu('Set B');

			const saveResponse = await saveResponsePromise;
			expect(saveResponse.ok()).toBe(true);

			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await expect(pong.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
			await expect(groupNote(pong)).toBeVisible();
		});
	},
);

test.describe(
	'Canvas node groups with multi-output boundary',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow(IF_FIXTURE);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(5);
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.deselectAll();
		});

		test('allows grouping but not extraction when the selection ends in an IF node with both branches connected', async ({
			pong,
		}) => {
			await pong.canvas.selectNodes(['Set A', 'If']);

			await expect(pong.canvas.connectionBetweenNodes('If', 'Set B')).toHaveCount(1);
			await expect(pong.canvas.connectionBetweenNodes('If', 'Set C')).toHaveCount(1);
			await expect(pong.canvas.selectionToolbar.groupButton()).toBeVisible();
			await expect(pong.canvas.selectionToolbar.extractSubWorkflowButton()).toBeHidden();
			await pong.canvas.selectionToolbar.groupButton().click();

			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await expect(pong.canvas.getNodeGroupTitle(DEFAULT_GROUP_TITLE)).toBeVisible();
		});
	},
);

test.describe(
	'Canvas node groups loaded from API',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromImportedWorkflow(PERSISTED_FIXTURE);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(VISIBLE_NODES_AFTER_COLLAPSED_LOAD);
			await pong.canvas.clickZoomToFitButton();
		});

		test('renders groups from nodeGroups without creating them in the UI', async ({ pong }) => {
			await expect(pong.canvas.getNodeGroups()).toHaveCount(1);
			await expect(pong.canvas.getNodeGroupTitle(PERSISTED_GROUP_TITLE)).toBeVisible();
		});
	},
);

test.describe(
	'Canvas node groups — collapse / expand',
	{ annotation: [{ type: 'owner', description: 'Knowledge' }] },
	() => {
		test.describe('Default state on workflow load', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(VISIBLE_NODES_AFTER_COLLAPSED_LOAD);
				await pong.canvas.clickZoomToFitButton();
			});

			test('groups load collapsed: frame is hidden, chevron shows expand caption', async ({
				pong,
			}) => {
				await expect(pong.canvas.getNodeGroupTitle(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
				await expect(pong.canvas.groupToggleButton(PERSISTED_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Expand',
				);
			});

			test('clicking the chevron expands the group: frame and chevron caption flip', async ({
				pong,
			}) => {
				await pong.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);

				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(pong.canvas.groupToggleButton(PERSISTED_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Collapse',
				);
			});

			test('clicking the chevron again collapses back', async ({ pong }) => {
				await pong.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();

				await pong.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
			});

			test('deleting a remapped collapsed-group connection clears it from workflow data', async ({
				pong,
			}) => {
				await pong.canvas.deleteConnectionBetweenNodes('Set B', 'Set C');
				await expect(pong.canvas.connectionBetweenNodes('Set B', 'Set C')).toBeHidden();

				await pong.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(pong.canvas.nodeByName('Set B')).toBeVisible();
				await expect(pong.canvas.connectionBetweenNodes('Set B', 'Set C')).toBeHidden();
			});
		});

		test.describe('Newly created groups start expanded', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.start.fromImportedWorkflow(FIXTURE);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
				await pong.canvas.clickZoomToFitButton();
				await pong.canvas.deselectAll();
			});

			test('a freshly created group is expanded; its frame is visible immediately', async ({
				pong,
			}) => {
				await pong.canvas.selectNodes(['Set A', 'Set B']);
				await pong.canvas.selectionToolbar.groupButton().click();

				await expect(pong.canvas.getNodeGroupFrame(DEFAULT_GROUP_TITLE)).toBeVisible();
				await expect(pong.canvas.groupToggleButton(DEFAULT_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Collapse',
				);
			});
		});

		test.describe('Expand state persists across reload', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.start.fromImportedWorkflow(PERSISTED_FIXTURE);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(VISIBLE_NODES_AFTER_COLLAPSED_LOAD);
				await pong.canvas.clickZoomToFitButton();
			});

			test('a group expanded by the user reloads expanded', async ({ pong }) => {
				// The group loads collapsed by default; expand it deliberately.
				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeHidden();
				await pong.canvas.toggleNodeGroup(PERSISTED_GROUP_TITLE);
				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();

				await pong.page.reload();

				await expect(pong.canvas.getNodeGroupFrame(PERSISTED_GROUP_TITLE)).toBeVisible();
				await expect(pong.canvas.groupToggleButton(PERSISTED_GROUP_TITLE)).toHaveAttribute(
					'aria-label',
					'Collapse',
				);
			});
		});
	},
);
