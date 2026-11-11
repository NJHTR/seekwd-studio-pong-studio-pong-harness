import type { Page } from '@playwright/test';

import { setupDefaultInterceptors } from '../config/intercepts';
import type { pongPage } from '../pages/pongPage';
import { ApiHelpers } from '../services/api-helper';
import type { TestUser } from '../services/user-api-helper';

/**
 * Composer for UI test entry points. All methods in this class navigate to or verify UI state.
 * For API-only testing, use the standalone `api` fixture directly instead.
 */
export class TestEntryComposer {
	constructor(private readonly pong: pongPage) {}

	/**
	 * Start UI test from the home page and navigate to canvas
	 */
	async fromHome() {
		await this.pong.goHome();
		await this.pong.page.waitForURL('/home/workflows');
	}

	/**
	 * Start UI test from a blank canvas (assumes already on canvas)
	 */
	async fromBlankCanvas() {
		await this.pong.navigate.toWorkflow('new');
		// Wait for the canvas loader to clear before returning so tests don't
		// interact with a canvas still covered by the full-screen loader.
		await this.pong.canvas.waitForBlankCanvasReady();
	}

	/**
	 * Start UI test from a workflow in a new project on a new canvas
	 */
	async fromNewProjectBlankCanvas() {
		// Enable features to allow us to create a new project
		await this.pong.api.enableFeature('projectRole:admin');
		await this.pong.api.enableFeature('projectRole:editor');
		await this.pong.api.setMaxTeamProjectsQuota(-1);

		// Create a project using the API
		const response = await this.pong.api.projects.createProject();

		const projectId = response.id;
		await this.pong.navigate.toWorkflow('new', { projectId });
		await this.pong.canvas.waitForBlankCanvasReady();
		return projectId;
	}

	async fromNewProject() {
		const response = await this.pong.api.projects.createProject();
		const projectId = response.id;
		await this.pong.navigate.toProject(projectId);
		return projectId;
	}

	/**
	 * Start UI test from the canvas of an imported workflow
	 * Returns the workflow import result for use in the test
	 */
	async fromImportedWorkflow(workflowFile: string) {
		const workflowImportResult = await this.pong.api.workflows.importWorkflowFromFile(workflowFile);
		await this.pong.navigate.toWorkflow(workflowImportResult.workflowId);
		// Wait for the canvas loading overlay to clear and the imported nodes to
		// render before returning, so tests don't interact with a canvas that is
		// still covered by the full-screen loader.
		await this.pong.canvas.waitForCanvasReady();
		await this.pong.canvas.getCanvasNodes().first().waitFor({ state: 'visible' });
		return workflowImportResult;
	}

	/**
	 * Start UI test on the canvas of an existing workflow (e.g. one created via
	 * the API). Waits for the canvas loader to clear and the workflow's nodes to
	 * render before returning, so tests don't interact with a canvas still
	 * covered by the full-screen loader.
	 */
	async fromExistingWorkflow(workflowId: string) {
		await this.pong.navigate.toWorkflow(workflowId);
		await this.pong.canvas.waitForCanvasReady();
		await this.pong.canvas.getCanvasNodes().first().waitFor({ state: 'visible' });
	}

	async fromInstanceAi() {
		await this.pong.navigate.toInstanceAi();
		await this.pong.instanceAi.getChatInput().waitFor({ state: 'visible', timeout: 30_000 });
	}

	async fromInstanceAiThread(threadId: string) {
		await this.pong.instanceAi.gotoThread(threadId);
		await this.pong.instanceAi.getChatInput().waitFor({ state: 'visible', timeout: 30_000 });
	}

	/**
	 * Start UI test on a new page created by an action
	 * @param action - The action that will create a new page
	 * @returns pongPage instance for the new page
	 */
	async fromNewPage(action: () => Promise<void>): Promise<pongPage> {
		const newPagePromise = this.pong.page.waitForEvent('popup');
		await action();
		const newPage = await newPagePromise;
		await newPage.waitForLoadState('domcontentloaded');
		return this.wrapPage(newPage);
	}

	/**
	 * Open a fresh tab in the current browser context (shared session) and
	 * return an pongPage facade bound to it. Use for multi-tab scenarios such
	 * as the instance-ai memory benchmarks that drive several threads in
	 * parallel within the same authenticated context.
	 */
	async newTab(): Promise<pongPage> {
		const newPage = await this.pong.page.context().newPage();
		return this.wrapPage(newPage);
	}

	/**
	 * Wraps a page in a new pongPage that keeps this instance's API options, so a
	 * workflow created from the new page lands on the same engine.
	 * Uses the constructor from the current instance to avoid a circular import.
	 */
	private wrapPage(page: Page): pongPage {
		const pongPageConstructor = this.pong.constructor as new (page: Page, api: ApiHelpers) => pongPage;
		return new pongPageConstructor(
			page,
			new ApiHelpers(page.context().request, this.pong.api.options),
		);
	}

	/**
	 * Enable project feature set
	 * Allow project creation, sharing, and folder creation
	 */
	async withProjectFeatures() {
		await this.pong.api.enableFeature('sharing');
		await this.pong.api.enableFeature('folders');
		await this.pong.api.enableFeature('advancedPermissions');
		await this.pong.api.enableFeature('projectRole:admin');
		await this.pong.api.enableFeature('projectRole:editor');
		await this.pong.api.setMaxTeamProjectsQuota(-1);
	}

	/**
	 * Create a new isolated user context with fresh page and authentication.
	 * Use this when you need a browser context for UI interactions.
	 * For API-only operations, use `api.createApiForUser()` instead.
	 * @param user - User with email and password
	 * @returns Fresh pongPage instance with user authentication
	 */
	async withUser(user: Pick<TestUser, 'email' | 'password'>): Promise<pongPage> {
		const browser = this.pong.page.context().browser()!;
		const context = await browser.newContext();
		await setupDefaultInterceptors(context, this.pong.api.options);
		const page = await context.newPage();
		const newPong = this.wrapPage(page);
		await newPong.api.login({ email: user.email, password: user.password });
		return newPong;
	}
}
