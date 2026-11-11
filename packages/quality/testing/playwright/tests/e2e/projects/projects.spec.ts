import { nanoid } from 'nanoid';

import { INSTANCE_MEMBER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'projects' } } });

const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
const EXECUTE_WORKFLOW_NODE_NAME = 'Execute Sub-workflow';
const NOTION_NODE_NAME = 'Notion';
const EDIT_FIELDS_SET_NODE_NAME = 'Edit Fields (Set)';
const NOTION_API_KEY = 'abc123Playwright';

test.describe(
	'Projects @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test.beforeEach(async ({ pong }) => {
			await pong.goHome();
			// Enable features required for project workflows and moving resources
			await pong.api.enableFeature('sharing');
			await pong.api.enableFeature('folders');
			await pong.api.enableFeature('advancedPermissions');
			await pong.api.enableFeature('projectRole:admin');
			await pong.api.enableFeature('projectRole:editor');
			await pong.api.setMaxTeamProjectsQuota(-1);
		});

		test.describe('when starting from scratch', () => {
			test('should not show project add button and projects to a member if not invited to any project @auth:member', async ({
				pong,
			}) => {
				await pong.sideBar.universalAdd();
				await expect(pong.sideBar.getProjectButtonInUniversalAdd()).toContainClass('is-disabled');
				await expect(pong.sideBar.getProjectMenuItems()).toHaveCount(0);
			});

			// This test needs empty credentials list - must run before tests that create credentials
			test('should allow changing an inaccessible credential when the workflow was moved to a team project @auth:owner', async ({
				pong,
			}) => {
				// Seed the setup via API (none of it is under test): a personal Notion
				// credential, a personal workflow whose Notion node is bound to it, and a
				// team project the member can edit. Building this through the UI navigates
				// enough that V8 coverage accumulation trips the ~512MB string cap; seeding
				// keeps the run to a single page load. goHome() then loads the sidebar with
				// the new resources (same pattern as projects-move-resources.spec.ts).
				const credential = await pong.api.credentials.createCredential({
					name: 'Credential in Home project',
					type: 'notionApi',
					data: { apiKey: NOTION_API_KEY },
				});

				await pong.api.workflows.createWorkflow({
					name: 'My workflow',
					active: false,
					nodes: [
						{
							id: nanoid(),
							name: "When clicking 'Execute workflow'",
							type: 'pong-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: nanoid(),
							name: 'Append a block',
							type: 'pong-nodes-base.notion',
							typeVersion: 2.2,
							position: [220, 0],
							parameters: {},
							credentials: { notionApi: { id: credential.id, name: credential.name } },
						},
					],
					connections: {
						"When clicking 'Execute workflow'": {
							main: [[{ node: 'Append a block', type: 'main', index: 0 }]],
						},
					},
				});

				const { id: projectId, name: projectName } =
					await pong.api.projects.createProject('Project 1');
				await pong.api.projects.addUserToProjectByEmail(
					projectId,
					INSTANCE_MEMBER_CREDENTIALS[0].email,
					'project:editor',
				);

				await pong.goHome();
				// Wait for the Overview list to load. A click on the sidebar before that
				// can be dropped when the initial page load finishes.
				await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);

				await pong.sideBar.clickPersonalMenuItem();
				await pong.sideBar.clickWorkflowsLink();

				await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);

				await pong.workflowComposer.moveToProject('My workflow', projectName);

				await expect(pong.workflows.cards.getWorkflows()).toHaveCount(0);

				await pong.sideBar.clickProjectMenuItem(projectName);
				await pong.navigate.toWorkflows();

				await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);
				await expect(
					pong.workflows.cards.getWorkflowCardText('My workflow', 'Personal'),
				).toBeHidden();

				await pong.sideBar.clickSignout();
				await pong.page.waitForURL(/\/signin/);
				await pong.signIn.loginWithEmailAndPassword(
					INSTANCE_MEMBER_CREDENTIALS[0].email,
					INSTANCE_MEMBER_CREDENTIALS[0].password,
				);

				await expect(pong.workflows.getProjectName()).toBeVisible();

				await pong.sideBar.clickProjectMenuItem(projectName);
				await pong.navigate.toWorkflows();

				await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);

				await pong.workflows.cards.clickWorkflowCard('My workflow');

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);

				await pong.canvas.openNode('Append a block');

				// The owner's credential stays on the node, marked as one the member
				// cannot use, so the member can switch to a credential of their own
				await expect(pong.ndv.credentials.getUnusableWarning()).toBeVisible();
				await expect(pong.ndv.getNodeCredentialsEmptyState()).toBeHidden();
			});

			test('should filter credentials by project ID when creating new workflow or hard reloading an opened workflow', async ({
				pong,
			}) => {
				const { projectName, projectId } = await pong.projectComposer.createProject();
				await pong.projectComposer.addCredentialToProject(
					projectName,
					'Notion API',
					'apiKey',
					NOTION_API_KEY,
				);

				const credentials = await pong.api.credentials.getCredentialsByProject(projectId);
				expect(credentials).toHaveLength(1);

				const { projectId: project2Id } = await pong.projectComposer.createProject();
				const credentials2 = await pong.api.credentials.getCredentialsByProject(project2Id);
				expect(credentials2).toHaveLength(0);
			});

			test('should create sub-workflow and credential in the sub-workflow in the same project @auth:owner', async ({
				pong,
			}) => {
				const { projectName } = await pong.projectComposer.createProject();
				await pong.sideBar.addWorkflowFromUniversalAdd(projectName);
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.waitForSaveWorkflowCompleted();

				await pong.canvas.addNode(EXECUTE_WORKFLOW_NODE_NAME, { action: 'Execute A Sub Workflow' });

				const subpong = await pong.start.fromNewPage(() =>
					pong.ndv.selectWorkflowResource(`Create a Sub-Workflow in '${projectName}'`),
				);

				await subpong.ndv.clickBackToCanvasButton();

				await subpong.canvas.deleteNodeByName('Replace me with your logic');
				await subpong.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block' });
				await subpong.credentialsComposer.createFromNdv({
					apiKey: NOTION_API_KEY,
				});

				await subpong.ndv.clickBackToCanvasButton();
				await subpong.canvas.waitForSaveWorkflowCompleted();

				await subpong.navigate.toWorkflows();
				await subpong.sideBar.clickProjectMenuItem(projectName);
				await subpong.navigate.toWorkflows();

				await expect(subpong.workflows.cards.getWorkflows()).toHaveCount(2);

				await expect(subpong.workflows.cards.getWorkflow('My Sub-Workflow')).toBeVisible();

				await subpong.navigate.toCredentials();

				await expect(subpong.credentials.cards.getCredentials()).toHaveCount(1);
				await expect(subpong.credentials.cards.getCredential('Notion account')).toBeVisible();
			});

			test('should create credential from workflow in the correct project after editor page refresh @auth:owner', async ({
				pong,
			}) => {
				const { projectName } = await pong.projectComposer.createProject(`Dev ${nanoid(8)}`);

				await pong.sideBar.clickProjectMenuItem(projectName);
				await pong.navigate.toWorkflows();

				await pong.workflows.clickNewWorkflowButtonFromOverview();
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.waitForSaveWorkflowCompleted();

				// Wait for URL to update with workflow ID after save
				await pong.page.waitForURL(/\/workflow\/[^/]+$/);

				await pong.page.reload();
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(1);

				await pong.canvas.addNode(NOTION_NODE_NAME, { action: 'Append a block' });
				await pong.credentialsComposer.createFromNdv({
					apiKey: NOTION_API_KEY,
				});
				await pong.ndv.close();
				await pong.canvas.waitForSaveWorkflowCompleted();

				await pong.sideBar.clickProjectMenuItem(projectName);
				await pong.navigate.toCredentials();

				await expect(pong.credentials.cards.getCredentials()).toHaveCount(1);
			});

			test('should set and update project icon @auth:admin', async ({ pong }) => {
				const DEFAULT_ICON = 'layers';
				const NEW_PROJECT_NAME = `Test Project ${nanoid(8)}`;

				await pong.projectComposer.createProject(NEW_PROJECT_NAME);

				await expect(pong.projectSettings.getIconPickerIcon()).toHaveAttribute(
					'data-icon',
					DEFAULT_ICON,
				);

				await pong.projectSettings.clickIconPickerButton();
				await pong.projectSettings.selectIconTab('Emojis');

				await pong.projectSettings.selectFirstEmoji();

				await expect(
					pong.notifications.getNotificationByTitle('Project icon updated successfully'),
				).toBeVisible();

				await expect(pong.projectSettings.getIconPickerButton()).toContainText('😀');

				await pong.sideBar.expand();
				await expect(
					pong.sideBar.getProjectMenuItems().filter({ hasText: NEW_PROJECT_NAME }),
				).toContainText('😀');
			});

			test('should be able to create a workflow when in the workflow editor @auth:owner', async ({
				pong,
			}) => {
				await pong.navigate.toWorkflow('new');
				await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
				await pong.canvas.waitForSaveWorkflowCompleted();

				// Wait for URL to be updated (new=true removed after save)
				await pong.page.waitForURL(/\/workflow\/[^?]+$/);
				const savedWorkflowUrl = pong.page.url();

				await pong.sideBar.addWorkflowFromUniversalAdd('Personal');

				// Close dropdown/menu
				await pong.sideBar.dismissMenu();

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);

				await pong.page.goBack();

				expect(pong.page.url()).toBe(savedWorkflowUrl);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(2);

				await pong.sideBar.addWorkflowFromUniversalAdd('Personal');

				// New workflows redirect to /workflow/<id>?new=true
				await pong.page.waitForURL(/\/workflow\/[a-zA-Z0-9_-]+\?.*new=true/);

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(0);
			});
		});
	},
);
