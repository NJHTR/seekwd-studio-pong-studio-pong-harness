import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

const NOTIFICATIONS = {
	ARCHIVED: 'archived',
	UNARCHIVED: 'unarchived',
	DELETED: 'deleted',
	UNPUBLISHED: 'unpublished',
};

test.describe(
	'Workflows',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.goHome();
		});

		test('should create a new workflow using empty state button', async ({ pong }) => {
			const { projectId } = await pong.projectComposer.createProject();
			await pong.page.goto(`projects/${projectId}/workflows`);
			await pong.workflows.clickNewWorkflowButtonFromProject();
			// New workflows redirect to /workflow/<id>?new=true
			await expect(pong.page).toHaveURL(/workflow\/[a-zA-Z0-9_-]+\?.*new=true/);
		});

		test('should create a new workflow using add workflow button and save successfully', async ({
			pong,
		}) => {
			const { projectId } = await pong.projectComposer.createProject();
			await pong.page.goto(`projects/${projectId}/workflows`);
			await pong.workflows.addResource.workflow();

			const uniqueIdForCreate = nanoid(8);
			const workflowName = `Test Workflow ${uniqueIdForCreate}`;
			await pong.canvas.setWorkflowName(workflowName);
			await pong.page.keyboard.press('Enter');
			await pong.canvas.waitForSaveWorkflowCompleted();
		});

		test('should search for workflows', async ({ pong }) => {
			const uniqueId = nanoid(8);
			const specificName = `Specific Test ${uniqueId}`;
			const genericName = `Generic Test ${uniqueId}`;

			await pong.workflowComposer.createWorkflowFromSidebar(specificName);
			await pong.goHome();
			await pong.workflowComposer.createWorkflow(genericName);
			await pong.goHome();

			// Search for specific workflow
			await pong.workflows.search(specificName);
			await expect(pong.workflows.cards.getWorkflow(specificName)).toBeVisible();

			// Search with partial term
			await pong.workflows.clearSearch();
			await pong.workflows.search(uniqueId);
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(2);

			// Search for non-existent
			await pong.workflows.clearSearch();
			await pong.workflows.search('NonExistentWorkflow123');
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(0);
			await expect(pong.workflows.getNoWorkflowsFoundMessage()).toBeVisible();
		});

		test('should search workflows in command bar', async ({ pong }) => {
			const uniqueId = nanoid(8);
			const firstWorkflowName = `Command Bar Alpha ${uniqueId}`;
			const secondWorkflowName = `Command Bar Beta ${uniqueId}`;

			const firstWorkflow = await pong.api.workflows.createWorkflow({
				name: firstWorkflowName,
				nodes: [],
				connections: {},
			});
			await pong.api.workflows.createWorkflow({
				name: secondWorkflowName,
				nodes: [],
				connections: {},
			});

			await pong.goHome();
			await pong.commandBar.search(firstWorkflowName);
			await pong.commandBar.waitForLoadingToFinish();

			await expect(pong.commandBar.getItem(firstWorkflowName)).toBeVisible();
			await expect(pong.commandBar.getItem(secondWorkflowName)).toBeHidden();

			await pong.commandBar.selectItem(firstWorkflowName);
			await expect(pong.page).toHaveURL(new RegExp(`/workflow/${firstWorkflow.id}(\\?.*)?$`));
		});

		test('should archive and unarchive a workflow', async ({ pong }) => {
			const uniqueIdForArchive = nanoid(8);
			const workflowName = `Archive Test ${uniqueIdForArchive}`;
			await pong.workflowComposer.createWorkflowFromSidebar(workflowName);
			await pong.goHome();

			// Create a second workflow so we can still see filters
			await pong.workflowComposer.createWorkflow();
			await pong.goHome();

			const workflow = pong.workflows.cards.getWorkflow(workflowName);
			await pong.workflows.archiveWorkflow(workflow);
			await expect(pong.notifications.getNotificationByTitle(NOTIFICATIONS.ARCHIVED)).toBeVisible();

			await expect(workflow).toBeHidden();
			await pong.workflows.toggleShowArchived();
			await expect(workflow).toBeVisible();

			await pong.workflows.unarchiveWorkflow(workflow);
			await expect(
				pong.notifications.getNotificationByTitle(NOTIFICATIONS.UNARCHIVED),
			).toBeVisible();
		});

		test('should delete an archived workflow', async ({ pong }) => {
			const uniqueIdForDelete = nanoid(8);
			const workflowName = `Delete Test ${uniqueIdForDelete}`;
			await pong.workflowComposer.createWorkflowFromSidebar(workflowName);
			await pong.goHome();
			await pong.workflowComposer.createWorkflow();
			await pong.goHome();

			const workflow = pong.workflows.cards.getWorkflow(workflowName);
			await pong.workflows.archiveWorkflow(workflow);
			await expect(pong.notifications.getNotificationByTitle(NOTIFICATIONS.ARCHIVED)).toBeVisible();

			await pong.workflows.toggleShowArchived();

			await pong.workflows.deleteWorkflow(workflow);
			await expect(pong.notifications.getNotificationByTitle(NOTIFICATIONS.DELETED)).toBeVisible();

			await expect(workflow).toBeHidden();
		});

		test('should unpublish a published workflow from workflow list', async ({ pong }) => {
			const uniqueIdForUnpublish = nanoid(8);
			const workflowName = `Unpublish Test ${uniqueIdForUnpublish}`;

			// Create and publish a workflow
			await pong.workflowComposer.createWorkflow(workflowName);

			// Add a webhook trigger to make workflow publishable
			await pong.canvas.clickCanvasPlusButton();
			await pong.canvas.nodeCreator.searchFor('webhook');
			await pong.canvas.nodeCreator.selectItem('Webhook');
			await pong.page.keyboard.press('Escape');

			// Publish the workflow and close the success modal, which opens once the
			// publication is confirmed via push — it must not linger over the list view
			await pong.canvas.publishWorkflow();
			await pong.workflowActivationModal.dismiss();
			await expect(pong.canvas.getPublishedIndicator()).toBeVisible();

			// Go back to workflows list
			await pong.goHome();

			// Find the published workflow and unpublish it
			const workflow = pong.workflows.cards.getWorkflow(workflowName);
			await expect(workflow).toBeVisible();

			// Unpublish the workflow from the workflow card actions menu
			await pong.workflows.unpublishWorkflow(workflow);

			// Verify unpublish notification appears
			await expect(
				pong.notifications.getNotificationByTitle(NOTIFICATIONS.UNPUBLISHED),
			).toBeVisible();

			// Verify workflow still exists but is no longer published
			await expect(workflow).toBeVisible();

			// Open workflow to verify it's no longer published
			await workflow.click();
			await expect(pong.canvas.getPublishedIndicator()).toBeHidden();
			await expect(pong.canvas.getOpenPublishModalButton()).toBeVisible();
		});

		test('should filter workflows by tag', async ({ pong }) => {
			const { id: projectId } = await pong.api.projects.createProject();

			const taggedWorkflow = await pong.api.workflows.createInProject(projectId);
			const tag = await pong.api.tags.create(`test-tag-${nanoid(8)}`);
			await pong.api.workflows.setTags(taggedWorkflow.id, [tag.id]);

			await pong.api.workflows.createInProject(projectId);

			await pong.page.goto(`projects/${projectId}/workflows`);
			await pong.workflows.filterByTag(tag.name);

			await expect(pong.workflows.cards.getWorkflow(taggedWorkflow.name)).toBeVisible();
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);
		});

		test('should preserve search and filters in URL', async ({ pong }) => {
			const { id: projectId } = await pong.api.projects.createProject();

			const workflowName = `My Tagged Workflow ${nanoid(8)}`;
			const taggedWorkflow = await pong.api.workflows.createInProject(projectId, {
				name: workflowName,
			});
			const tag1 = await pong.api.tags.create(`test-tag-${nanoid(8)}`);
			const tag2 = await pong.api.tags.create(`test-tag-${nanoid(8)}`);
			await pong.api.workflows.setTags(taggedWorkflow.id, [tag1.id, tag2.id]);

			await pong.page.goto(`projects/${projectId}/workflows`);
			await pong.workflows.search('Tagged');
			await pong.workflows.filterByTag(tag1.name);

			await expect(pong.page).toHaveURL(/search=Tagged/);

			await pong.page.reload();

			await expect(pong.workflows.getSearchBar()).toHaveValue('Tagged');
			await expect(pong.workflows.cards.getWorkflow(workflowName)).toBeVisible();
		});

		test('should share a workflow', async ({ pong }) => {
			const uniqueIdForShare = nanoid(8);
			const workflowName = `Share Test ${uniqueIdForShare}`;
			await pong.workflowComposer.createWorkflow(workflowName);
			await pong.goHome();

			await pong.workflows.shareWorkflow(workflowName);
			await expect(pong.workflowSharingModal.container).toBeVisible();
		});
	},
);
