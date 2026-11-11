import { test, expect } from '../../../fixtures/base';

test.describe(
	'Folders - Basic Operations',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		const FOLDER_CREATED_NOTIFICATION = 'Folder created';
		test('should create folder from the workflows page using addResource dropdown', async ({
			pong,
		}) => {
			await pong.start.fromNewProject();
			const folderName = await pong.workflows.addFolder();
			await expect(pong.workflows.cards.getFolder(folderName)).toBeVisible();
			await expect(pong.workflows.cards.getFolders()).toHaveCount(1);
		});

		test('should create folder from inside a folder', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const folder = await pong.api.projects.createFolder(projectId);
			const folderName = folder.name;
			await pong.workflows.cards.openFolder(folderName);
			const childFolderName = await pong.workflows.addFolder();
			await expect(pong.workflows.cards.getFolder(childFolderName)).toBeVisible();
		});

		test('should create a folder from breadcrumbs', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const folder = await pong.api.projects.createFolder(projectId);
			const folderName = folder.name;
			await pong.workflows.cards.openFolder(folderName);
			// This opens the folder actions menu
			await pong.workflows.getFolderBreadcrumbsActions().click();

			await pong.workflows.getFolderBreadcrumbsAction('create').click();
			const childFolderName = 'My Child Folder';
			await pong.workflows.fillFolderModal(childFolderName);

			await expect(pong.workflows.cards.getFolder(childFolderName)).toBeVisible();
		});

		test('should create a folder from the card dropdown', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const folder = await pong.api.projects.createFolder(projectId);
			const folderName = folder.name;
			const folderCard = pong.workflows.cards.getFolder(folderName);
			await pong.workflows.cards.openCardActions(folderCard);
			await pong.workflows.cards.getCardAction('create').click();
			const childFolderName = 'My Child Folder';
			await pong.workflows.fillFolderModal(childFolderName);
			await expect(pong.workflows.cards.getFolder(childFolderName)).toBeVisible();
		});

		test('should navigate from nested folder back to project root via breadcrumbs', async ({
			pong,
		}) => {
			const projectId = await pong.start.fromNewProject();
			const parentFolder = await pong.api.projects.createFolder(projectId);
			const childFolder = await pong.api.projects.createFolder(
				projectId,
				'Child Folder',
				parentFolder.id,
			);
			const grandChildFolder = await pong.api.projects.createFolder(
				projectId,
				'Grand Child Folder',
				childFolder.id,
			);

			await pong.navigate.toFolder(grandChildFolder.id, projectId);
			await expect(pong.breadcrumbs.getCurrentBreadcrumb()).toContainText(grandChildFolder.name);

			// Hidden breadcrumb should be visible because not all breadcrumbs can fit in the UI
			await pong.breadcrumbs.getHiddenBreadcrumbs().click();
			await expect(pong.breadcrumbs.getActionToggleDropdown(parentFolder.id)).toBeVisible();

			await pong.breadcrumbs.getBreadcrumb(childFolder.name).click();
			await expect(pong.workflows.cards.getFolder(grandChildFolder.name)).toBeVisible();

			await pong.breadcrumbs.getBreadcrumb(parentFolder.name).click();
			await expect(pong.workflows.cards.getFolder(childFolder.name)).toBeVisible();

			await pong.breadcrumbs.getHomeProjectBreadcrumb().click();
			await expect(pong.workflows.cards.getFolder(parentFolder.name)).toBeVisible();
		});

		test('should find nested folders through search from project root', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const rootFolder = await pong.api.projects.createFolder(projectId, 'Root Test Folder');
			const childFolder = await pong.api.projects.createFolder(
				projectId,
				'Child Test Folder',
				rootFolder.id,
			);
			const grandChildFolder = await pong.api.projects.createFolder(
				projectId,
				'Grand Child Test Folder',
				childFolder.id,
			);

			// Start at project root
			await pong.navigate.toProject(projectId);

			// Search for "Grand Child" from root - should find the deeply nested folder
			await pong.workflows.search('Grand Child');

			// Verify the grandchild folder appears in search results
			await expect(pong.workflows.cards.getFolder(grandChildFolder.name)).toBeVisible();

			// Verify other folders are filtered out
			await expect(pong.workflows.cards.getFolder(rootFolder.name)).toBeHidden();
			await expect(pong.workflows.cards.getFolder(childFolder.name)).toBeHidden();

			// Clear search and verify all folders are shown again
			await pong.workflows.clearSearch();
			await expect(pong.workflows.cards.getFolder(rootFolder.name)).toBeVisible();
			await expect(pong.workflows.cards.getFolder(childFolder.name)).toBeHidden(); // Child is inside root
			await expect(pong.workflows.cards.getFolder(grandChildFolder.name)).toBeHidden(); // Grandchild is inside child
		});

		test('should create workflow in a folder', async ({ pong }) => {
			const { id: projectId } = await pong.api.projects.createProject();
			const folder = await pong.api.projects.createFolder(projectId);
			await pong.navigate.toFolder(folder.id, projectId);
			await pong.workflows.addResource.workflow();
			// Change name to trigger save
			await pong.canvas.setWorkflowName('Workflow in Folder');
			await pong.page.keyboard.press('Enter');
			await pong.canvas.waitForSaveWorkflowCompleted();
			await pong.navigate.toFolder(folder.id, projectId);
			await expect(pong.workflows.cards.getWorkflows()).toBeVisible();
		});

		test('should not create folders with invalid names in the UI', async ({ pong }) => {
			await pong.start.fromNewProject();
			const invalidNames = ['folder[test]', 'folder/test'];
			const errorMessage = 'Folder name cannot contain the following characters';
			const emptyErrorMessage = 'Folder name cannot be empty';
			const tooLongErrorMessage = 'Folder name cannot be longer than 128 characters';
			const dotsErrorMessage = 'Folder name cannot contain only dots';
			await pong.workflows.addResource.folder();

			for (const invalidName of invalidNames) {
				await pong.modal.fillInput(invalidName);
				await expect(pong.modal.getText(errorMessage, { exact: false })).toBeVisible();
			}

			await pong.modal.fillInput('');
			await expect(pong.modal.getText(emptyErrorMessage)).toBeVisible();

			await pong.modal.fillInput('a'.repeat(129));
			await expect(pong.modal.getText(tooLongErrorMessage)).toBeVisible();

			await pong.modal.fillInput('...');
			await expect(pong.modal.getText(dotsErrorMessage)).toBeVisible();
		});

		test('should navigate to a folder using card actions', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const folder = await pong.api.projects.createFolder(projectId);
			const folderName = folder.name;
			const folderCard = pong.workflows.cards.getFolder(folderName);
			await pong.workflows.cards.openCardActions(folderCard);
			await pong.workflows.cards.getCardAction('open').click();
			await expect(pong.breadcrumbs.getCurrentBreadcrumb()).toContainText(folderName);
		});

		test('should navigate to a folder using notification', async ({ pong }) => {
			await pong.start.fromNewProject();
			const folderName = await pong.workflows.addFolder();
			await pong.notifications
				.getNotificationAction(FOLDER_CREATED_NOTIFICATION, 'Open folder')
				.click();
			await expect(pong.breadcrumbs.getCurrentBreadcrumb()).toContainText(folderName);
		});
	},
);
