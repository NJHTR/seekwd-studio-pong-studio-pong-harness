import { test, expect } from '../../../fixtures/base';

test.describe(
	'Folders - Advanced Operations',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe('Duplicate workflows', () => {
			test('should duplicate workflow within root folder from personal projects', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const { name: workflowName } = await pong.api.workflows.createInProject(projectId);
				await pong.navigate.toProject(projectId);
				const workflowCard = pong.workflows.cards.getWorkflow(workflowName);
				await pong.workflows.cards.openCardActions(workflowCard);
				await pong.workflows.cards.getCardAction('duplicate').click();
				const duplicatePage = await pong.start.fromNewPage(async () => {
					await pong.modal.clickButton('Duplicate');
				});

				const duplicatedName = `${workflowName} copy`;
				await duplicatePage.navigate.toProject(projectId);
				await expect(duplicatePage.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
			});

			test('should duplicate workflow within a folder from personal projects', async ({ pong }) => {
				const projectId = await pong.start.fromNewProject();
				const folder = await pong.api.projects.createFolder(projectId);
				const { name: workflowName } = await pong.api.workflows.createInProject(projectId, {
					folder: folder.id,
				});
				await pong.navigate.toFolder(folder.id, projectId);

				const workflowCard = pong.workflows.cards.getWorkflow(workflowName);
				await pong.workflows.cards.openCardActions(workflowCard);
				await pong.workflows.cards.getCardAction('duplicate').click();

				const duplicatePage = await pong.start.fromNewPage(async () => {
					await pong.modal.clickButton('Duplicate');
				});

				await duplicatePage.navigate.toFolder(folder.id);
				const duplicatedName = `${workflowName} copy`;
				await expect(duplicatePage.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
			});

			test('should duplicate workflow within a folder from workflow page', async ({ pong }) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const folder = await pong.api.projects.createFolder(projectId);
				const { name: workflowName, id: workflowId } = await pong.api.workflows.createInProject(
					projectId,
					{
						folder: folder.id,
					},
				);
				await pong.navigate.toCanvas(workflowId);

				await pong.workflowMenu.openDuplicate();
				const duplicatePage = await pong.start.fromNewPage(async () => {
					await pong.modal.clickButton('Duplicate');
				});

				const duplicatedName = `${workflowName} copy`;
				await duplicatePage.navigate.toFolder(folder.id, projectId);
				await expect(duplicatePage.workflows.cards.getWorkflow(duplicatedName)).toBeVisible();
			});
		});

		test.describe('Drag and drop', () => {
			test('should drag and drop folders into folders', async ({ pong }) => {
				const { id: projectId } = await pong.api.projects.createProject('Drag and Drop Test');
				await pong.navigate.toProject(projectId);
				const targetFolder = await pong.api.projects.createFolder(projectId, 'Drag me');
				const destinationFolder = await pong.api.projects.createFolder(
					projectId,
					'Folder Destination',
				);

				const sourceFolderCard = pong.workflows.cards.getFolder(targetFolder.name);
				const destinationFolderCard = pong.workflows.cards.getFolder(destinationFolder.name);

				await pong.interactions.precisionDragToTarget(sourceFolderCard, destinationFolderCard);

				await expect(
					pong.notifications.getNotificationByTitleOrContent(
						`${targetFolder.name} has been moved to ${destinationFolder.name}`,
					),
				).toBeVisible();

				await expect(pong.workflows.cards.getFolders()).toHaveCount(1);

				await pong.workflows.cards.openFolder(destinationFolder.name);
				await expect(pong.workflows.cards.getFolder(targetFolder.name)).toBeVisible();
			});

			test('should drag and drop folders into project root breadcrumb', async ({ pong }) => {
				const project = await pong.api.projects.createProject('Drag to root test');
				await pong.navigate.toProject(project.id);
				const parentFolder = await pong.api.projects.createFolder(project.id, 'Parent Folder');
				const targetFolder = await pong.api.projects.createFolder(
					project.id,
					'To Project root',
					parentFolder.id,
				);

				await pong.navigate.toFolder(parentFolder.id, project.id);

				const sourceFolderCard = pong.workflows.cards.getFolder(targetFolder.name);
				const projectBreadcrumb = pong.breadcrumbs.getHomeProjectBreadcrumb();

				await pong.interactions.precisionDragToTarget(sourceFolderCard, projectBreadcrumb);

				await expect(
					pong.notifications.getNotificationByTitleOrContent(
						`${targetFolder.name} has been moved to ${project.name}`,
					),
				).toBeVisible();

				await expect(pong.workflows.cards.getFolders()).toHaveCount(0);

				await pong.navigate.toProject(project.id);
				await expect(pong.workflows.cards.getFolder(targetFolder.name)).toBeVisible();
			});

			test('should drag and drop workflows into folders', async ({ pong }) => {
				const { id: projectId } = await pong.api.projects.createProject('Drag and Drop WF Test');
				const { name: workflowName } = await pong.api.workflows.createInProject(projectId, {});
				const destinationFolder = await pong.api.projects.createFolder(projectId);
				await pong.navigate.toProject(projectId);

				const sourceWorkflowCard = pong.workflows.cards.getWorkflow(workflowName);
				const destinationFolderCard = pong.workflows.cards.getFolder(destinationFolder.name);

				await pong.interactions.precisionDragToTarget(sourceWorkflowCard, destinationFolderCard);

				await expect(
					pong.notifications.getNotificationByTitleOrContent(
						`${workflowName} has been moved to ${destinationFolder.name}`,
					),
				).toBeVisible();

				await expect(pong.workflows.cards.getWorkflows()).toHaveCount(0);

				await pong.workflows.cards.openFolder(destinationFolder.name);
				await expect(pong.workflows.cards.getWorkflow(workflowName)).toBeVisible();
			});
		});
	},
);
