import { expect } from '@playwright/test';

import type { pongPage } from '../pages/pongPage';

export class CanvasComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Pin the data on a node. Then close the node.
	 * @param nodeName - The name of the node to pin the data on.
	 */
	async pinNodeData(nodeName: string) {
		await this.pong.canvas.openNode(nodeName);
		await this.pong.ndv.togglePinData();
		await this.pong.ndv.close();
	}

	/**
	 * Copy selected nodes and verify success toast
	 */
	async copySelectedNodesWithToast(): Promise<void> {
		await this.pong.clipboard.grant();
		await this.pong.canvas.copyNodes();
		await this.pong.notifications.waitForNotificationAndClose('Copied to clipboard');
	}

	/**
	 * Select all nodes and copy them
	 */
	async selectAllAndCopy(): Promise<void> {
		await this.pong.clipboard.grant();
		await this.pong.canvas.selectAll();
		await this.copySelectedNodesWithToast();
	}

	/**
	 * Get workflow JSON from clipboard
	 * Grants permissions, selects all, copies, and returns parsed workflow
	 * @returns The parsed workflow object from clipboard
	 */
	async getWorkflowFromClipboard(): Promise<{
		nodes: Array<{ credentials?: Record<string, unknown> }>;
		meta?: Record<string, unknown>;
	}> {
		await this.selectAllAndCopy();
		return JSON.parse(await this.pong.clipboard.readText());
	}

	/**
	 * Switch between editor and workflow history and back
	 */
	async switchBetweenEditorAndHistory(): Promise<void> {
		await this.pong.canvas.openWorkflowHistory();
		await this.pong.canvas.closeWorkflowHistory();
		await this.pong.page.waitForLoadState();
		// Wait for the editor's loading overlay to clear before subsequent header
		// interactions; nodes can report visible while the overlay still blocks clicks.
		await this.pong.canvas.waitForCanvasReady();
		await expect(this.pong.workflowMenu.getTrigger()).toBeVisible();
		await expect(this.pong.canvas.getCanvasNodes().first()).toBeVisible();
		await expect(this.pong.canvas.getCanvasNodes().last()).toBeVisible();
	}

	/**
	 * Switch between editor and workflow list and back
	 */
	async switchBetweenEditorAndWorkflowList(workflowName: string): Promise<void> {
		await this.pong.sideBar.clickHomeButton();
		await this.pong.workflows.cards.getWorkflow(workflowName).click();
		// Wait for the editor's loading overlay to clear before subsequent header
		// interactions; nodes can report visible while the overlay still blocks clicks.
		await this.pong.canvas.waitForCanvasReady();
		await expect(this.pong.canvas.getCanvasNodes().first()).toBeVisible();
		await expect(this.pong.canvas.getCanvasNodes().last()).toBeVisible();
	}

	/**
	 * Zoom in and validate that zoom functionality works
	 */
	async zoomInAndCheckNodes(): Promise<void> {
		await this.pong.canvas.getCanvasNodes().first().waitFor();

		// Reset the saved viewport before each check so earlier zooms do not hit the zoom limit.
		await this.pong.canvas.clickZoomToFitButton();
		await this.pong.canvas.waitForCanvasZoomSettled();
		const initialZoom = await this.pong.canvas.getCanvasZoomLevel();

		await this.pong.canvas.clickZoomInButton();

		await expect
			.poll(async () => await this.pong.canvas.getCanvasZoomLevel(), {
				message:
					"Zoom functionality not working: canvas didn't scale in. " +
					`Initial zoom: ${initialZoom.toFixed(3)}`,
			})
			.toBeGreaterThan(initialZoom * 1.1);
	}

	/**
	 * Rename a node using keyboard shortcut
	 * @param oldName - The current name of the node
	 * @param newName - The new name for the node
	 */
	async renameNodeViaShortcut(oldName: string, newName: string): Promise<void> {
		await this.pong.canvas.nodeByName(oldName).click();
		await this.pong.page.keyboard.press('F2');
		await expect(this.pong.canvas.getRenamePrompt()).toBeVisible();
		await this.pong.page.keyboard.type(newName);
		await this.pong.page.keyboard.press('Enter');
	}

	/**
	 * Reload the page and wait for canvas to be ready
	 */
	async reloadAndWaitForCanvas(): Promise<void> {
		await this.pong.page.reload();
		await expect(this.pong.canvas.getNodeViewLoader()).toBeHidden();
		await expect(this.pong.canvas.getLoadingMask()).toBeHidden();
	}

	/**
	 * Wait for workflow save to complete and URL to be updated with the workflow ID.
	 * Use this when you need the workflow URL/ID immediately after saving.
	 * @returns The workflow URL after save
	 */
	async waitForWorkflowSaveAndUrl(): Promise<string> {
		const isNewWorkflow = this.pong.navigate.currentUrl().includes('/workflow/new');

		if (isNewWorkflow) {
			await this.pong.canvas.waitForSaveWorkflowCompleted();
			// Wait for URL to update after response
			await this.pong.page.waitForURL(/\/workflow\/[a-zA-Z0-9]+$/);
		} else {
			await this.pong.canvas.waitForSaveWorkflowCompleted();
		}

		return this.pong.navigate.currentUrl();
	}
}
