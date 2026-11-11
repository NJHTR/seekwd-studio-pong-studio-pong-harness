import { INSTANCE_MEMBER_CREDENTIALS } from '../../../../config/test-users';
import { test, expect } from '../../../../fixtures/base';
import type { pongPage } from '../../../../pages/pongPage';

test.use({ capability: { env: { TEST_ISOLATION: 'viewer-permissions' } } });

const MEMBER_EMAIL = INSTANCE_MEMBER_CREDENTIALS[0].email;

// Helper to set up a project with a workflow and sign in as member with specified role
async function setupProjectWithWorkflowAndSignInAsMember({
	pong,
	roleSlug,
	nodeName,
}: {
	pong: pongPage;
	roleSlug: string;
	nodeName: string;
}): Promise<void> {
	await pong.navigate.toHome();

	// Create project and add member with role
	const { projectId, projectName: createdProjectName } = await pong.projectComposer.createProject();
	await pong.api.projects.addUserToProjectByEmail(projectId, MEMBER_EMAIL, roleSlug);

	// Create workflow with node
	await pong.sideBar.clickProjectMenuItem(createdProjectName);
	await pong.workflows.clickNewWorkflowButtonFromProject();
	await pong.canvas.addNode(nodeName, { closeNDV: true });
	await pong.canvas.waitForSaveWorkflowCompleted();

	// Sign in as member and navigate to the workflow
	await pong.api.signin('member', 0);
	await pong.navigate.toHome();
	await pong.sideBar.clickProjectMenuItem(createdProjectName);
	await pong.workflows.cards.getWorkflows().first().click();
	await expect(pong.canvas.canvasPane()).toBeVisible();
	await expect(pong.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });
	await expect(pong.canvas.getLoadingMask()).not.toBeAttached();
}

test.describe(
	'Workflow Viewer Permissions',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		let readOnlyRole: { slug: string };
		let editorRole: { slug: string };

		test.beforeAll(async ({ api }) => {
			await api.enableFeature('sharing');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('customRoles');
			await api.setMaxTeamProjectsQuota(-1);

			// Sign in as owner (admin) to create custom roles
			await api.signin('owner');

			// Create custom read-only role (no workflow:update scope)
			readOnlyRole = await api.roles.createCustomRole(
				['project:read', 'workflow:read', 'workflow:list'],
				'Workflow Read Only',
			);

			// Create custom editor role (with workflow:update scope)
			editorRole = await api.roles.createCustomRole(
				['project:read', 'workflow:read', 'workflow:list', 'workflow:update', 'workflow:execute'],
				'Workflow Custom Editor',
			);
		});

		test('user without workflow:update scope cannot drag nodes @auth:owner', async ({ pong }) => {
			await setupProjectWithWorkflowAndSignInAsMember({
				pong,
				roleSlug: readOnlyRole.slug,
				nodeName: 'Edit Fields (Set)',
			});

			// Attempt to drag - node should not move (no workflow:update scope)
			const node = pong.canvas.nodeByName('Edit Fields');
			const initialPosition = await node.boundingBox();

			await pong.canvas.dragNodeToRelativePosition('Edit Fields', 100, 50);

			const finalPosition = await node.boundingBox();

			// Position should remain unchanged
			expect(finalPosition?.x).toBe(initialPosition?.x);
			expect(finalPosition?.y).toBe(initialPosition?.y);
		});

		test('user without workflow:update can copy but cannot paste @auth:owner', async ({ pong }) => {
			await setupProjectWithWorkflowAndSignInAsMember({
				pong,
				roleSlug: readOnlyRole.slug,
				nodeName: 'Edit Fields (Set)',
			});

			// Copy SHOULD work (useful for copying to another workflow)
			await pong.canvasComposer.selectAllAndCopy();

			// Paste should NOT work (requires workflow:update)
			const nodeCountBefore = await pong.canvas.getCanvasNodes().count();
			await pong.page.keyboard.press('ControlOrMeta+V');
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(nodeCountBefore);
		});

		test('user with workflow:update scope can drag and paste @auth:owner', async ({ pong }) => {
			await setupProjectWithWorkflowAndSignInAsMember({
				pong,
				roleSlug: editorRole.slug,
				nodeName: 'Edit Fields (Set)',
			});

			// Drag should work
			const node = pong.canvas.nodeByName('Edit Fields');
			const initialPosition = await node.boundingBox();

			await pong.canvas.dragNodeToRelativePosition('Edit Fields', 100, 50);

			// Position SHOULD change
			await expect.poll(async () => (await node.boundingBox())?.x).not.toBe(initialPosition?.x);

			// Copy and paste should work
			await pong.canvasComposer.selectAllAndCopy();

			const nodeCountBefore = await pong.canvas.getCanvasNodes().count();
			await pong.page.keyboard.press('ControlOrMeta+V');
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(nodeCountBefore + 1);
		});
	},
);
