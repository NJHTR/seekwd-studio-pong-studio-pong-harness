import { expect } from '@playwright/test';

import type { pongPage } from '../pages/pongPage';

/**
 * A class for user interactions with workflows that go across multiple pages.
 */
export class WorkflowComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Executes a successful workflow and waits for the notification to be closed.
	 * This waits for http calls and also closes the notification.
	 */
	async executeWorkflowAndWaitForNotification(
		notificationMessage: string,
		options: { timeout?: number } = {},
	) {
		const responsePromise = this.pong.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/workflows/') &&
				response.url().includes('/run') &&
				response.request().method() === 'POST',
		);

		await this.pong.canvas.clickExecuteWorkflowButton();
		await responsePromise;
		await this.pong.notifications.waitForNotificationAndClose(notificationMessage, options);
	}

	/**
	 * Creates a new workflow by clicking the add workflow button and setting the name
	 * Workflow is autosaved after a name update
	 * @param workflowName - The name of the workflow to create
	 */
	async createWorkflow(workflowName = 'My New Workflow') {
		await this.pong.workflows.addResource.workflow();
		await this.pong.canvas.setWorkflowName(workflowName);
		await this.pong.page.keyboard.press('Enter');

		await this.pong.canvas.waitForSaveWorkflowCompleted();
	}

	/**
	 * Creates a new workflow by clicking the add workflow button
	 * Workflow is autosaved after a name update
	 * @param workflowName - The name of the workflow to create
	 */
	async createWorkflowFromSidebar(workflowName = 'My New Workflow') {
		await this.pong.sideBar.addWorkflowFromUniversalAdd('Personal');
		await this.pong.canvas.setWorkflowName(workflowName);
		await this.pong.page.keyboard.press('Enter');

		await this.pong.canvas.waitForSaveWorkflowCompleted();
	}

	/**
	 * Duplicates a workflow via the duplicate modal UI.
	 * Verifies the form interaction completes without errors.
	 * Note: This opens a new window/tab with the duplicated workflow but doesn't interact with it.
	 * @param name - The name for the duplicated workflow
	 * @param tag - Optional tag to add to the workflow
	 */
	async duplicateWorkflow(name: string, tag?: string): Promise<void> {
		await this.pong.workflowMenu.openDuplicate();

		const modal = this.pong.workflowMenu.getDuplicateModal();
		await expect(modal).toBeVisible();

		const nameInput = this.pong.workflowMenu.getDuplicateNameInput();
		await expect(nameInput).toBeVisible();
		await nameInput.press('ControlOrMeta+a');
		await nameInput.fill(name);

		if (tag) {
			const tagsInput = this.pong.workflowMenu.getDuplicateTagsInput();
			await tagsInput.fill(tag);
			await tagsInput.press('Enter');
			await tagsInput.press('Escape');
		}

		const saveButton = this.pong.workflowMenu.getDuplicateSaveButton();
		await expect(saveButton).toBeVisible();
		await saveButton.click();
	}

	/**
	 * Moves a workflow to a different project or user.
	 * @param workflowName - The name of the workflow to move
	 * @param projectNameOrEmail - The destination project name or user email
	 * @param folder - The folder name (e.g., 'My Folder') or 'No folder (project root)' to place the workflow at project root level.
	 *   Pass null when moving to another user's personal project, as users cannot create folders in other users' personal spaces,
	 *   so the folder dropdown will not be shown. Defaults to 'No folder (project root)' which places the workflow at the root level.
	 */
	async moveToProject(
		workflowName: string,
		projectNameOrEmail: string,
		folder: string | null = 'No folder (project root)',
	): Promise<void> {
		const workflowCard = this.pong.workflows.cards.getWorkflow(workflowName);
		await this.pong.workflows.cards.openCardActions(workflowCard);
		await this.pong.workflows.cards.getCardAction('moveToFolder').click();
		await this.selectProjectInMoveModal(projectNameOrEmail);

		if (folder !== null) {
			// Wait for folder dropdown to appear after project selection
			await this.pong.resourceMoveModal.getFolderSelect().waitFor({ state: 'visible' });
			await this.selectFolderInMoveModal(folder);
		}

		// The list only refetches after the transfer has completed. Waiting for the
		// request keeps the next navigation from reading the pre-move state.
		const transferred = this.pong.page.waitForResponse(
			(response) =>
				response.request().method() === 'PUT' &&
				/\/rest\/workflows\/[^/]+\/transfer$/.test(response.url()),
		);
		await this.pong.resourceMoveModal.clickConfirmMoveButton();
		expect((await transferred).ok()).toBe(true);
	}

	private async selectProjectInMoveModal(projectNameOrEmail: string): Promise<void> {
		const workflowSelect = this.pong.resourceMoveModal.getProjectSelect();
		const input = workflowSelect.locator('input');
		await input.click();
		await input.waitFor({ state: 'visible' });
		await this.pong.page.keyboard.press('ControlOrMeta+a');
		await this.pong.page.keyboard.press('Backspace');

		// Only an account with global project:list searches the server (GET /projects); a
		// member without it filters its already-fetched project list locally, with no
		// matching response to wait for. Bound the wait so that misuse fails fast instead
		// of hanging until the test timeout — every caller today authenticates as an owner
		// or admin, both of which have project:list.
		const searchResponse = this.pong.page.waitForResponse(
			(response) =>
				response.request().method() === 'GET' &&
				new URL(response.url()).pathname.endsWith('/projects') &&
				new URL(response.url()).searchParams.get('search') === projectNameOrEmail,
			{ timeout: 20_000 },
		);
		await this.pong.page.keyboard.type(projectNameOrEmail, { delay: 50 });
		await searchResponse;

		const projectOption = this.pong.page
			.getByTestId('project-sharing-info')
			.getByText(projectNameOrEmail)
			.first();
		await projectOption.waitFor({ state: 'visible' });
		await projectOption.click();
	}

	private async selectFolderInMoveModal(folderName: string): Promise<void> {
		await this.pong.resourceMoveModal.getFolderSelect().locator('input').click();

		const folderSearchResponse = this.pong.page.waitForResponse(
			(response) => {
				if (response.request().method() !== 'GET') return false;
				const url = new URL(response.url());
				if (!url.pathname.endsWith('/folders')) return false;
				const filterParam = url.searchParams.get('filter');
				if (!filterParam) return false;
				try {
					return (JSON.parse(filterParam) as { name?: string }).name === folderName;
				} catch {
					return false;
				}
			},
			{ timeout: 20_000 },
		);
		await this.pong.page.keyboard.type(folderName, { delay: 50 });
		await folderSearchResponse;

		const folderOption = this.pong.resourceMoveModal.getFolderOption(folderName);
		await folderOption.waitFor({ state: 'visible' });
		await folderOption.click();
	}
}
