import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';
import { type GitRepoHelper, setupGitRepo } from '../../../utils/source-control-helper';

test.use({ capability: 'source-control' });

async function expectPullSuccess(pong: pongPage) {
	await pong.notifications.waitForNotificationAndClose('Pulled successfully', { timeout: 30000 });
}

// Skipped: These tests are flaky. Re-enable when PAY-4365 is resolved.
// https://linear.app/pong/issue/PAY-4365/bug-source-control-operations-fail-in-multi-main-deployment
test.describe(
	'Pull resources from Git',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.fixme();

		let gitRepo: GitRepoHelper;

		test.beforeEach(async ({ pong, services }) => {
			await pong.api.enableFeature('sourceControl');
			await pong.api.enableFeature('variables');
			gitRepo = await setupGitRepo(pong, services.gitea);
		});

		test('should pull new resources from remote', async ({ pong }) => {
			// create project
			const project = await pong.api.projects.createProject('Test Project');
			const folder = await pong.api.projects.createFolder(project.id, 'Test Folder');
			// create folder
			const workflow = await pong.api.workflows.createInProject(project.id, {
				name: 'Pull Test Workflow',
				folder: folder.id,
			});
			const credential = await pong.api.credentials.createCredential({
				name: 'Test Credential',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project.id,
			});
			const variable = await pong.api.variables.createVariable({
				key: 'PULL_TEST_VARIABLE',
				value: 'test-value',
				projectId: project.id,
			});

			const tag = await pong.api.tags.create('pull-test-tag');

			// push all resources
			await pong.api.sourceControl.pushWorkFolder({
				commitMessage: 'Initial push',
			});

			// disconnect
			await pong.api.sourceControl.disconnect();

			// delete created resources
			await pong.api.projects.deleteProject(project.id); // This also deletes all related resources
			await pong.api.tags.delete(tag.id);

			// re-connect to source control
			await pong.api.sourceControl.connect({ repositoryUrl: gitRepo.repoUrl });

			// pull all resources
			await pong.navigate.toHome();
			await pong.sideBar.getSourceControlPullButton().click();
			await expectPullSuccess(pong);

			// check that all new resources are pulled
			await pong.navigate.toProjectSettings(project.id);
			await expect(pong.projectSettings.getTitle()).toHaveText(project.name);

			await pong.projectTabs.clickCredentialsTab();
			await expect(pong.credentials.cards.getCredential(credential.name)).toBeVisible();

			await pong.projectTabs.clickVariablesTab();
			await expect(pong.variables.getVariableRow(variable.key)).toBeVisible();

			await pong.projectTabs.clickWorkflowsTab();
			await expect(pong.workflows.cards.getFolder(folder.name)).toBeVisible();

			await pong.workflows.cards.openFolder(folder.name);
			await expect(pong.workflows.cards.getWorkflow(workflow.name)).toBeVisible();

			await pong.workflows.cards.clickWorkflowCard(workflow.name);
			await pong.canvas.openTagManagerModal();
			await expect(pong.canvas.tagsManagerModal.getModal()).toBeVisible();
			await expect(pong.canvas.tagsManagerModal.getTable()).toBeVisible();
			await expect(pong.canvas.tagsManagerModal.getTagByName('pull-test-tag')).toBeVisible();
		});

		test('should pull modified and deleted resources from remote', async ({ pong }) => {
			const project = await pong.api.projects.createProject('Pull Test Project');
			const workflow = await pong.api.workflows.createInProject(project.id, {
				name: 'Pull Test Workflow',
			});

			// push
			await pong.api.sourceControl.pushWorkFolder({
				commitMessage: 'Initial push',
			});

			// disconnect
			await pong.api.sourceControl.disconnect();

			// modify workflow
			await pong.navigate.toWorkflow(workflow.id);
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.waitForSaveWorkflowCompleted();

			// add new workflow
			await pong.api.workflows.createInProject(project.id, {
				name: 'New Workflow',
			});

			// re-connect to source control
			await pong.api.sourceControl.connect({ repositoryUrl: gitRepo.repoUrl });

			// pull
			await pong.navigate.toHome();
			await pong.sideBar.getSourceControlPullButton().click();
			await expect(pong.sourceControlPullModal.container).toBeVisible();

			// check that conflicts are detected
			await pong.sourceControlPullModal.selectWorkflowsTab();
			await expect(pong.sourceControlPullModal.getFileInModal('New Workflow')).toBeVisible();
			await expect(
				pong.sourceControlPullModal.getStatusBadge('New Workflow', 'Deleted'),
			).toBeVisible();

			await expect(pong.sourceControlPullModal.getFileInModal('Pull Test Workflow')).toBeVisible();
			await expect(
				pong.sourceControlPullModal.getStatusBadge('Pull Test Workflow', 'Modified'),
			).toBeVisible();

			// click on pull & override button
			await pong.sourceControlPullModal.getPullAndOverrideButton().click();
			await expectPullSuccess(pong);

			// check pulled resources
			await pong.navigate.toWorkflow(workflow.id);
			await expect(pong.canvas.getWorkflowName()).toHaveAttribute('title', 'Pull Test Workflow');
			await pong.navigate.toHome();
			await expect(pong.workflows.cards.getWorkflow('New Workflow')).toBeHidden();
		});
	},
);
