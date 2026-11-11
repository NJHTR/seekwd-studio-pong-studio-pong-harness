import { test, expect } from '../../../fixtures/base';

test.describe(
	'Folders - Operations',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe('Rename and delete folders', () => {
			test('should rename folder from breadcrumb dropdown', async ({ pong }) => {
				await pong.start.fromNewProject();
				const folderName = await pong.workflows.addFolder();
				const folderCard = pong.workflows.cards.getFolder(folderName);
				await pong.workflows.cards.openCardActions(folderCard);
				await pong.workflows.cards.getCardAction('open').click();
				await pong.breadcrumbs.renameCurrentBreadcrumb('Renamed');
				await pong.breadcrumbs.getHomeProjectBreadcrumb().click();
				await expect(pong.workflows.cards.getFolder('Renamed')).toBeVisible();
			});

			test('should rename folder from card dropdown', async ({ pong }) => {
				await pong.start.fromNewProject();
				const folderName = await pong.workflows.addFolder();
				const folderCard = pong.workflows.cards.getFolder(folderName);
				await pong.workflows.cards.openCardActions(folderCard);
				await pong.workflows.cards.getCardAction('rename').click();
				await pong.workflows.fillFolderModal('Renamed', 'Rename');
				await expect(pong.workflows.cards.getFolder('Renamed')).toBeVisible();
			});

			test('should delete empty folder from card dropdown', async ({ pong }) => {
				await pong.start.fromNewProject();
				const folderName = await pong.workflows.addFolder();
				await pong.workflows.cards.deleteFolder(folderName);
				await expect(pong.workflows.cards.getFolder(folderName)).toBeHidden();
			});

			test('should delete empty folder from breadcrumb dropdown', async ({ pong }) => {
				await pong.start.fromNewProject();
				const folderName = await pong.workflows.addFolder();
				await pong.workflows.cards.openFolder(folderName);
				await pong.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
				await pong.breadcrumbs.getActionToggleDropdown('delete').click();
				await expect(pong.workflows.cards.getFolder(folderName)).toBeHidden();
			});

			test('should warn before deleting non-empty folder from breadcrumb dropdown', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const folder = await pong.api.projects.createFolder(projectId);
				await pong.api.workflows.createInProject(projectId, {
					folder: folder.id,
				});
				await pong.navigate.toFolder(folder.id, projectId);
				await pong.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
				await pong.breadcrumbs.getActionToggleDropdown('delete').click();
				await expect(pong.workflows.deleteFolderModal()).toBeVisible();
				await expect(pong.workflows.deleteModalConfirmButton()).toBeDisabled();
			});

			test('should warn before deleting non-empty folder from card dropdown', async ({ pong }) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const folder = await pong.api.projects.createFolder(projectId);
				await pong.api.workflows.createInProject(projectId, {
					folder: folder.id,
				});
				await pong.navigate.toProject(projectId);
				const folderCard = pong.workflows.cards.getFolder(folder.name);
				await pong.workflows.cards.openCardActions(folderCard);
				await pong.workflows.cards.getCardAction('delete').click();
				await expect(pong.workflows.deleteFolderModal()).toBeVisible();
				await expect(pong.workflows.deleteModalConfirmButton()).toBeDisabled();
			});

			test('should transfer contents when deleting non-empty folder - from card dropdown', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const folderToDelete = await pong.api.projects.createFolder(projectId);
				await pong.api.workflows.createInProject(projectId, {
					folder: folderToDelete.id,
				});
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				await pong.navigate.toProject(projectId);

				const folderCard = pong.workflows.cards.getFolder(folderToDelete.name);
				await pong.workflows.cards.openCardActions(folderCard);
				await pong.workflows.cards.getCardAction('delete').click();
				await pong.workflows.deleteModalTransferRadioButton().click();
				await pong.workflows.transferFolderDropdown().click();
				await pong.workflows.transferFolderOption(destinationFolder.name).click();
				await pong.workflows.deleteModalConfirmButton().click();

				await expect(
					pong.notifications.getNotificationByTitleOrContent('Folder deleted'),
				).toBeVisible();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getWorkflows()).toBeVisible();
			});
		});

		test.describe('Move folders and workflows', () => {
			test('should move empty folder to another folder - from folder card action', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const sourceFolder = await pong.api.projects.createFolder(projectId);
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				await pong.navigate.toProject(projectId);

				const sourceFolderCard = pong.workflows.cards.getFolder(sourceFolder.name);
				await pong.workflows.cards.openCardActions(sourceFolderCard);
				await pong.workflows.cards.getCardAction('move').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();
				await pong.workflows.moveFolderOption(destinationFolder.name).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await expect(
					pong.notifications.getNotificationByTitleOrContent('Successfully moved folder'),
				).toBeVisible();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
			});

			test('should move folder with contents to another folder - from folder card action', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const sourceFolder = await pong.api.projects.createFolder(projectId);
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				await pong.api.workflows.createInProject(projectId, {
					folder: sourceFolder.id,
				});

				await pong.navigate.toProject(projectId);

				const sourceFolderCard = pong.workflows.cards.getFolder(sourceFolder.name);
				await pong.workflows.cards.openCardActions(sourceFolderCard);
				await pong.workflows.cards.getCardAction('move').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();
				await pong.workflows.moveFolderOption(destinationFolder.name).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await expect(
					pong.notifications.getNotificationByTitleOrContent('Successfully moved folder'),
				).toBeVisible();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
				await pong.workflows.cards.openFolder(sourceFolder.name);
				await expect(pong.workflows.cards.getWorkflows()).toBeVisible();
			});

			test('should move empty folder to another folder - from list breadcrumbs', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const sourceFolder = await pong.api.projects.createFolder(projectId);
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				await pong.navigate.toFolder(sourceFolder.id, projectId);
				await pong.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
				await pong.breadcrumbs.getActionToggleDropdown('move').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();
				await pong.workflows.moveFolderOption(destinationFolder.name).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
			});

			test('should move folder with contents to another folder - from list dropdown', async ({
				pong,
			}) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const sourceFolder = await pong.api.projects.createFolder(projectId);
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				await pong.api.workflows.createInProject(projectId, {
					folder: sourceFolder.id,
				});

				await pong.navigate.toFolder(sourceFolder.id, projectId);
				await pong.breadcrumbs.getFolderBreadcrumbsActionToggle().click();
				await pong.breadcrumbs.getActionToggleDropdown('move').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();
				await pong.workflows.moveFolderOption(destinationFolder.name).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getFolder(sourceFolder.name)).toBeVisible();
				await pong.workflows.cards.openFolder(sourceFolder.name);
				await expect(pong.workflows.cards.getWorkflows()).toBeVisible();
			});

			test('should move folder to project root - from folder card action', async ({ pong }) => {
				const project = await pong.api.projects.createProject();
				const parentFolder = await pong.api.projects.createFolder(project.id);
				const childFolderName = 'Child Folder';
				const childFolder = await pong.api.projects.createFolder(
					project.id,
					childFolderName,
					parentFolder.id,
				);

				await pong.navigate.toFolder(parentFolder.id, project.id);

				const childFolderCard = pong.workflows.cards.getFolder(childFolder.name);
				await pong.workflows.cards.openCardActions(childFolderCard);
				await pong.workflows.cards.getCardAction('move').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();

				const rootOption = 'No folder (project root)';
				await pong.workflows.moveFolderOption(rootOption).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await expect(
					pong.notifications.getNotificationByTitleOrContent('Successfully moved folder'),
				).toBeVisible();

				await pong.navigate.toProject(project.id);
				await expect(pong.workflows.cards.getFolder(childFolder.name)).toBeVisible();
			});

			test('should move workflow from project root to folder', async ({ pong }) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				await pong.api.workflows.createInProject(projectId);

				await pong.navigate.toProject(projectId);

				const workflowCard = pong.workflows.cards.getWorkflows().first();
				await pong.workflows.cards.openCardActions(workflowCard);
				await pong.workflows.cards.getCardAction('moveToFolder').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();
				await pong.workflows.moveFolderOption(destinationFolder.name).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await expect(
					pong.notifications.getNotificationByTitleOrContent('Successfully moved workflow'),
				).toBeVisible();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getWorkflows()).toBeVisible();
			});

			test('should move workflow to another folder', async ({ pong }) => {
				const { id: projectId } = await pong.api.projects.createProject();
				const sourceFolder = await pong.api.projects.createFolder(projectId);
				const destinationFolder = await pong.api.projects.createFolder(projectId);

				const { name: workflowName } = await pong.api.workflows.createInProject(projectId, {
					folder: sourceFolder.id,
				});

				await pong.navigate.toFolder(sourceFolder.id, projectId);

				const workflowCard = pong.workflows.cards.getWorkflow(workflowName);
				await pong.workflows.cards.openCardActions(workflowCard);
				await pong.workflows.cards.getCardAction('moveToFolder').click();

				await expect(pong.workflows.moveFolderModal()).toBeVisible();
				await pong.workflows.moveFolderDropdown().click();
				await pong.workflows.moveFolderOption(destinationFolder.name).click();
				await pong.workflows.moveFolderConfirmButton().click();

				await expect(
					pong.notifications.getNotificationByTitleOrContent('Successfully moved workflow'),
				).toBeVisible();

				await pong.navigate.toFolder(destinationFolder.id, projectId);
				await expect(pong.workflows.cards.getWorkflow(workflowName)).toBeVisible();

				await pong.navigate.toFolder(sourceFolder.id, projectId);
				await expect(pong.workflows.cards.getWorkflow(workflowName)).toBeHidden();
			});
		});
	},
);
