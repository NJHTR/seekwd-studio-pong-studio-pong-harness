import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';
import { type GitRepoHelper, setupGitRepo } from '../../../utils/source-control-helper';

test.use({ capability: 'source-control' });

async function expectPushSuccess(pong: pongPage) {
	await pong.notifications.waitForNotificationAndClose('Pushed successfully', { timeout: 30000 });
}

async function expectNoChangesToCommit(pong: pongPage) {
	await pong.notifications.waitForNotificationAndClose('No changes to commit', { timeout: 10000 });
}

// Skipped: These tests are flaky. Re-enable when PAY-4365 is resolved.
// https://linear.app/pong/issue/PAY-4365/bug-source-control-operations-fail-in-multi-main-deployment
test.describe(
	'Push resources to Git',
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

		test('should push a new workflow', async ({ pong }) => {
			// create workflow
			const workflow = await pong.api.workflows.createWorkflow({
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: false,
			});
			await pong.navigate.toWorkflow(workflow.id);

			// check modal
			await pong.sideBar.getSourceControlPushButton().click();
			await expect(pong.sourceControlPushModal.container).toBeVisible();
			const isWorkflowsTabSelected = await pong.sourceControlPushModal.isWorkflowsTabSelected();
			expect(isWorkflowsTabSelected).toBe(true);

			// check selected workflow
			await expect(pong.sourceControlPushModal.getFileInModal('Test Workflow')).toBeVisible();
			const workflowCheckbox = pong.sourceControlPushModal.getFileCheckboxByName('Test Workflow');
			await expect(workflowCheckbox).toBeChecked();

			// push and wait for commit to be indexed
			await gitRepo.pushAndWait(pong, 'Add test workflow with manual trigger');
			await expectPushSuccess(pong);

			// check no changes to commit
			await pong.sideBar.getSourceControlPushButton().click();
			await expectNoChangesToCommit(pong);
		});

		test('should push all resource types together', async ({ pong }) => {
			// variables and tags
			await pong.api.variables.createTestVariable();
			await pong.api.tags.create('test-tag');

			// projects and folders
			const project = await pong.api.projects.createProject('Test Project');
			const folderA = await pong.api.projects.createFolder(project.id, 'Folder A');
			const folderB = await pong.api.projects.createFolder(project.id, 'Folder B', folderA.id);

			// workflows
			await pong.api.workflows.createInProject(project.id, {
				name: 'Workflow in Folder A',
				folder: folderA.id,
			});
			await pong.api.workflows.createInProject(project.id, {
				name: 'Workflow in Folder B',
				folder: folderB.id,
			});
			await pong.api.workflows.createInProject(project.id, {
				name: 'Root Workflow',
			});

			// credentials
			await pong.api.credentials.createCredential({
				name: 'Credential in Project 1',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project.id,
			});

			// Open push modal
			await pong.navigate.toHome();
			await expect(pong.workflows.cards.getWorkflow('Workflow in Folder A')).toBeVisible();
			await expect(pong.workflows.cards.getWorkflow('Workflow in Folder B')).toBeVisible();
			await expect(pong.workflows.cards.getWorkflow('Root Workflow')).toBeVisible();

			await pong.sideBar.getSourceControlPushButton().click();
			await expect(pong.sourceControlPushModal.container).toBeVisible();

			// check notice
			const notice = pong.sourceControlPushModal.getNotice();
			await expect(notice).toBeVisible();
			expect(await notice.textContent()).toContain('Variables');
			expect(await notice.textContent()).toContain('Projects');
			expect(await notice.textContent()).toContain('Folders');
			expect(await notice.textContent()).toContain('Tags');

			// check workflows
			await pong.sourceControlPushModal.selectWorkflowsTab();
			await expect(pong.sourceControlPushModal.getFileInModal('Workflow in Folder A')).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileInModal('Workflow in Folder B')).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileInModal('Root Workflow')).toBeVisible();
			await pong.sourceControlPushModal.selectAllFilesInModal();

			// check credentials
			await pong.sourceControlPushModal.selectCredentialsTab();
			await expect(
				pong.sourceControlPushModal.getFileInModal('Credential in Project 1'),
			).toBeVisible();
			await pong.sourceControlPushModal.selectAllFilesInModal();

			// Push all resources
			await pong.sourceControlPushModal.push('Add all resource types');
			await expectPushSuccess(pong);
		});

		test('should push modifications and deletions', async ({ pong }) => {
			// create resources
			const project = await pong.api.projects.createProject('Test Project');
			const workflow = await pong.api.workflows.createInProject(project.id, {
				name: 'Workflow to Modify',
			});
			const credential = await pong.api.credentials.createCredential({
				name: 'Credential to Delete',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project.id,
			});

			// Push it to Git first
			await pong.navigate.toHome();
			await expect(pong.workflows.cards.getWorkflow('Workflow to Modify')).toBeVisible();
			await pong.sideBar.getSourceControlPushButton().click();
			await expect(pong.sourceControlPushModal.container).toBeVisible();

			await pong.sourceControlPushModal.selectWorkflowsTab();
			await pong.sourceControlPushModal.selectAllFilesInModal();

			await gitRepo.pushAndWait(pong, 'new resources');
			await expectPushSuccess(pong);

			// modify and delete resources
			await pong.navigate.toWorkflow(workflow.id);
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.waitForSaveWorkflowCompleted();

			await pong.api.credentials.deleteCredential(credential.id);

			await pong.sideBar.getSourceControlPushButton().click();
			await expect(pong.sourceControlPushModal.container).toBeVisible();

			await pong.sourceControlPushModal.selectWorkflowsTab();
			await expect(pong.sourceControlPushModal.getFileInModal('Workflow to Modify')).toBeVisible();
			await expect(
				pong.sourceControlPushModal.getStatusBadge('Workflow to Modify', 'Modified'),
			).toBeVisible();

			await pong.sourceControlPushModal.selectCredentialsTab();
			await expect(pong.sourceControlPushModal.getFileInModal('Credential to Delete')).toBeVisible();
			await expect(
				pong.sourceControlPushModal.getStatusBadge('Credential to Delete', 'Deleted'),
			).toBeVisible();

			// push and wait for commit
			await gitRepo.pushAndWait(pong, 'Modify workflow and delete credential');
			await expectPushSuccess(pong);

			// check no changes to commit
			await pong.sideBar.getSourceControlPushButton().click();
			await expectNoChangesToCommit(pong);
		});

		test('should push selected resources', async ({ pong }) => {
			// Create multiple workflows
			const workflowA = await pong.api.workflows.createWorkflow({
				name: 'Workflow A',
				nodes: [],
				connections: {},
				active: false,
			});

			await pong.api.workflows.createWorkflow({
				name: 'Workflow B',
				nodes: [],
				connections: {},
				active: false,
			});

			await pong.api.workflows.createWorkflow({
				name: 'Workflow C',
				nodes: [],
				connections: {},
				active: false,
			});

			// check resources
			await pong.navigate.toHome();
			await expect(pong.workflows.cards.getWorkflow('Workflow A')).toBeVisible();
			await expect(pong.workflows.cards.getWorkflow('Workflow B')).toBeVisible();
			await expect(pong.workflows.cards.getWorkflow('Workflow C')).toBeVisible();

			await pong.sideBar.getSourceControlPushButton().click();
			await expect(pong.sourceControlPushModal.container).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow B')).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeVisible();

			// select
			await pong.sourceControlPushModal.selectFile('Workflow A');
			await pong.sourceControlPushModal.selectFile('Workflow C');

			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeChecked();
			await expect(
				pong.sourceControlPushModal.getFileCheckboxByName('Workflow B'),
			).not.toBeChecked();
			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeChecked();

			// push and wait for commit
			await gitRepo.pushAndWait(pong, 'Push workflows A and C');
			await expectPushSuccess(pong);

			// modify workflow A
			await pong.navigate.toWorkflow(workflowA.id);
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.waitForSaveWorkflowCompleted();

			// check resources
			await pong.navigate.toHome();
			await pong.sideBar.getSourceControlPushButton().click();
			await expect(pong.sourceControlPushModal.container).toBeVisible();

			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow A')).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow B')).toBeVisible();
			await expect(pong.sourceControlPushModal.getFileCheckboxByName('Workflow C')).toBeHidden();

			await pong.sourceControlPushModal.selectFile('Workflow A');
			await pong.sourceControlPushModal.selectFile('Workflow B');

			// push and wait for commit
			await gitRepo.pushAndWait(pong, 'Push workflow A and B');
			await expectPushSuccess(pong);

			// Verify no more changes
			await pong.sideBar.getSourceControlPushButton().click();
			await expectNoChangesToCommit(pong);
		});
	},
);
