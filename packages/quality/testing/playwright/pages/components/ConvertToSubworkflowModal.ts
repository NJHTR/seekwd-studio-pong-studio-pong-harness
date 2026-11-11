import type { Locator } from '@playwright/test';

import { BasePage } from '../BasePage';

/**
 * Convert to Sub-workflow Modal component for converting nodes to sub-workflows.
 * Used within CanvasPage as `pong.canvas.convertToSubworkflowModal.*`
 *
 * @example
 * // Access via canvas page
 * await pong.canvas.rightClickNode('My Node');
 * await pong.canvas.clickContextMenuAction('extract_sub_workflow');
 * await pong.canvas.convertToSubworkflowModal.waitForModal();
 * await pong.canvas.convertToSubworkflowModal.clickSubmitButton();
 * await pong.canvas.convertToSubworkflowModal.waitForClose();
 */
export class ConvertToSubworkflowModal extends BasePage {
	constructor(private root: Locator) {
		super(root.page());
	}

	getSubmitButton(): Locator {
		return this.root.getByTestId('submit-button');
	}

	async waitForModal(): Promise<void> {
		await this.root.waitFor({ state: 'visible' });
	}

	async clickSubmitButton(): Promise<void> {
		await this.getSubmitButton().click();
	}

	async waitForClose(): Promise<void> {
		await this.root.waitFor({ state: 'hidden' });
	}
}
