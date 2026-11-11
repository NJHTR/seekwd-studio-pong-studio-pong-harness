import { test, expect } from '../../../../fixtures/base';
import type { pongPage } from '../../../../pages/pongPage';
import type { TestRequirements } from '../../../../Types';
import allTemplatesSearchResponse from '../../../../workflows/all_templates_search_response.json';
import onboardingWorkflow from '../../../../workflows/Onboarding_workflow.json';
import salesTemplatesSearchResponse from '../../../../workflows/sales_templates_search_response.json';
import templateWithoutCredentials from '../../../../workflows/Test_Template_2.json';
import workflowTemplate from '../../../../workflows/Workflow_template_write_http_query.json';

const TEMPLATE_HOST = {
	PONG_API: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	CUSTOM: 'random.domain',
} as const;

const URLS = {
	PONG_WORKFLOWS: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
} as const;

const TEMPLATE_ID = '1';
// Its nodes require credentials, but the template carries none (stripped on purpose).
const TEMPLATE_WITHOUT_CREDENTIALS_ID = '1344';
const TEMPLATE_WITHOUT_CREDENTIALS_NODES = ['IMAP Email', 'Nextcloud'];
const TEST_CATEGORY = 'sales';
const SALES_CATEGORY_ID = 3;

const CATEGORIES = [
	{ id: 1, name: 'Engineering' },
	{ id: 2, name: 'Finance' },
	{ id: 3, name: 'Sales' },
];

const COLLECTIONS = [
	{
		id: 1,
		name: 'Test Collection',
		workflows: [{ id: 1 }],
		nodes: [],
	},
];

// Helper functions
/**
 * Prevents the browser's "before unload" confirmation dialog
 * Used when navigating away from workflows with unsaved changes in tests
 */
function preventNavigation(pong: pongPage) {
	return pong.page.evaluate(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).preventNodeViewBeforeUnload = true;
	});
}

/**
 * Extracts the numeric count from UI text (e.g., "5 templates" → 5)
 * @param text - Text containing a number (e.g., "5 templates", "3 collections")
 * @returns The extracted number, or 0 if no number found
 */
function parseCount(text: string | null): number {
	const digits = text?.replace(/\D/g, '') ?? '';
	return parseInt(digits || '0', 10);
}

function createTemplateHostRequirements(): TestRequirements {
	return {
		config: {
			settings: {
				templates: {
					enabled: true,
					host: TEMPLATE_HOST.PONG_API,
				},
			},
		},
	};
}

function createCustomTemplateHostRequirements(hostname: string): TestRequirements {
	return {
		config: {
			settings: {
				templates: {
					enabled: true,
					host: `https://${hostname}/api`,
				},
			},
		},
		intercepts: {
			health: {
				url: `https://${hostname}/api/health`,
				response: { status: 'OK' },
			},
			categories: {
				url: `https://${hostname}/api/templates/categories`,
				response: { categories: CATEGORIES },
			},
			getTemplate: {
				url: `https://${hostname}/api/workflows/templates/${TEMPLATE_ID}`,
				response: {
					id: 1,
					name: onboardingWorkflow.name,
					workflow: onboardingWorkflow,
				},
			},
			getTemplatePreview: {
				url: `https://${hostname}/api/templates/workflows/${TEMPLATE_ID}`,
				response: workflowTemplate,
			},
			getTemplateWithoutCredentials: {
				url: `https://${hostname}/api/workflows/templates/${TEMPLATE_WITHOUT_CREDENTIALS_ID}`,
				response: templateWithoutCredentials.workflow,
			},
			getTemplateWithoutCredentialsPreview: {
				url: `https://${hostname}/api/templates/workflows/${TEMPLATE_WITHOUT_CREDENTIALS_ID}`,
				response: templateWithoutCredentials,
			},
		},
	};
}

/**
 * Setup dynamic template routes for collections and search
 * This handles query parameter-based routing that cannot be configured statically
 * - Collections API filters by category
 * - Search API returns different results based on category
 */
async function setupDynamicTemplateRoutes(pong: pongPage, hostname: string) {
	await pong.page.route(`https://${hostname}/api/templates/collections*`, (route) => {
		const url = new URL(route.request().url());
		const categoryParam = url.searchParams.get('category[]');
		const response = categoryParam === String(SALES_CATEGORY_ID) ? [] : COLLECTIONS;
		void route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ collections: response }),
		});
	});

	await pong.page.route(`https://${hostname}/api/templates/search*`, (route) => {
		const url = new URL(route.request().url());
		const category = url.searchParams.get('category');
		const response =
			category === 'Sales' ? salesTemplatesSearchResponse : allTemplatesSearchResponse;
		void route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(response),
		});
	});
}

test.describe(
	'Workflow templates',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.describe('For api.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', () => {
			test('Opens website when clicking templates sidebar link', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(createTemplateHostRequirements());
				await pong.navigate.toWorkflows();

				const templatesLink = pong.sideBar.getTemplatesLink();
				await expect(templatesLink).toBeVisible();

				const href = await templatesLink.getAttribute('href');
				expect(href).toContain(URLS.PONG_WORKFLOWS);

				const url = new URL(href!);
				const origin = await pong.page.evaluate(() => window.location.origin);

				const utmInstance = url.searchParams.get('utm_instance');
				expect(utmInstance).toBeTruthy();
				expect(decodeURIComponent(utmInstance!)).toContain(origin);

				const utmVersion = url.searchParams.get('utm_pong_version');
				expect(utmVersion).toBeTruthy();
				expect(utmVersion).toMatch(/[0-9]+\.[0-9]+\.[0-9]+/);

				const utmAwc = url.searchParams.get('utm_awc');
				expect(utmAwc).toBeTruthy();
				expect(utmAwc).toMatch(/[0-9]+/);

				await expect(templatesLink).toHaveAttribute('target', '_blank');
			});

			test('Redirects to website when visiting templates page directly', async ({
				pong,
				setupRequirements,
			}) => {
				await setupRequirements(createTemplateHostRequirements());
				await pong.navigate.toTemplates();

				await expect(pong.templates.getPageHeading()).toBeVisible({ timeout: 10000 });
			});
		});

		test.describe('For a custom template host', () => {
			const hostname = TEMPLATE_HOST.CUSTOM;

			test.beforeEach(async ({ pong, setupRequirements }) => {
				await setupRequirements(createCustomTemplateHostRequirements(hostname));
				await setupDynamicTemplateRoutes(pong, hostname);
			});

			test('can open onboarding flow', async ({ pong }) => {
				await preventNavigation(pong);

				await Promise.all([
					pong.page.waitForResponse(`https://${hostname}/api/workflows/templates/${TEMPLATE_ID}`),
					pong.page.waitForResponse('**/rest/workflows'),
					pong.navigate.toOnboardingTemplate(TEMPLATE_ID),
				]);

				await expect(pong.page).toHaveURL(/.*\/workflow\/.*onboardingId=1$/);

				const workflowNameOnboarding = await pong.canvas.getWorkflowName().getAttribute('title');
				expect(workflowNameOnboarding).toContain(`Demo: ${onboardingWorkflow.name}`);

				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
				await expect(pong.canvas.sticky.getStickies()).toHaveCount(1);
			});

			test('can import template', async ({ pong }) => {
				await preventNavigation(pong);

				await Promise.all([
					pong.page.waitForResponse(`https://${hostname}/api/workflows/templates/${TEMPLATE_ID}`),
					pong.page.waitForResponse('**/rest/workflows/**'),
					pong.navigate.toTemplateImport(TEMPLATE_ID),
				]);

				// New workflows redirect to /workflow/<id>?new=true&templateId=1
				await expect(pong.page).toHaveURL(/\/workflow\/[a-zA-Z0-9_-]+\?.*templateId=1/);
				await expect(pong.canvas.getCanvasNodes()).toHaveCount(4);
				await expect(pong.canvas.sticky.getStickies()).toHaveCount(1);

				const workflowName = await pong.canvas.getWorkflowName().getAttribute('title');
				expect(workflowName).toContain(onboardingWorkflow.name);
			});

			test('should save template id with the workflow', async ({ pong }) => {
				await pong.templatesComposer.importFirstTemplate();
				await pong.canvas.waitForCanvasReady();

				// Arm the save listener before executing: the run's immediate save can land before we listen.
				const saveResponsePromise = pong.canvas.waitForSaveWorkflowCompleted();
				await pong.canvas.hitExecuteWorkflow();
				const saveResponse = await saveResponsePromise;

				const requestBody = saveResponse.request().postDataJSON();
				expect(requestBody.meta.templateId).toBe(TEMPLATE_ID);
			});

			test('can open template with images and hides workflow screenshots', async ({ pong }) => {
				await pong.navigate.toTemplate(TEMPLATE_ID);
				await expect(pong.templates.getDescription()).toBeVisible();
				await expect(pong.templates.getDescriptionImages()).toHaveCount(1);
			});

			test('does not show node issue indicators on the template preview', async ({ pong }) => {
				// Control: the editor flags the same nodes, so a hidden badge on the
				// preview comes from the preview host and not from a missing issue.
				await pong.navigate.toTemplateImport(TEMPLATE_WITHOUT_CREDENTIALS_ID);
				for (const nodeName of TEMPLATE_WITHOUT_CREDENTIALS_NODES) {
					await expect(pong.canvas.nodeIssuesBadge(nodeName)).toBeVisible();
				}

				await preventNavigation(pong);
				await pong.navigate.toTemplate(TEMPLATE_WITHOUT_CREDENTIALS_ID);
				// The preview computes node issues as part of its load; assert absence
				// only once the canvas has finished loading.
				await pong.canvas.waitForCanvasReady();
				for (const nodeName of TEMPLATE_WITHOUT_CREDENTIALS_NODES) {
					await expect(pong.canvas.nodeByName(nodeName)).toBeVisible();
					await expect(pong.canvas.nodeIssuesBadge(nodeName)).toBeHidden();
				}
			});

			test('renders search elements correctly', async ({ pong }) => {
				await pong.navigate.toTemplates();

				await expect(pong.templates.getSearchInput()).toBeVisible();
				await expect(pong.templates.getAllCategoriesFilter()).toBeVisible();

				const categoryFilterCount = await pong.templates.getCategoryFilters().count();
				expect(categoryFilterCount).toBeGreaterThan(1);

				const templateCardCount = await pong.templates.getTemplateCards().count();
				expect(templateCardCount).toBeGreaterThan(0);
			});

			test('can filter templates by category', async ({ pong }) => {
				await pong.navigate.toTemplates();
				await expect(pong.templates.getTemplatesLoadingContainer()).toBeHidden();
				await expect(pong.templates.getCategoryFilter(TEST_CATEGORY)).toBeVisible();

				const initialTemplateText = await pong.templates.getTemplateCountLabel().textContent();
				const initialTemplateCount = parseCount(initialTemplateText);

				const initialCollectionText = await pong.templates.getCollectionCountLabel().textContent();
				const initialCollectionCount = parseCount(initialCollectionText);

				await pong.templates.clickCategoryFilter(TEST_CATEGORY);
				await expect(pong.templates.getTemplatesLoadingContainer()).toBeHidden();

				const finalTemplateText = await pong.templates.getTemplateCountLabel().textContent();
				const finalTemplateCount = parseCount(finalTemplateText);
				expect(finalTemplateCount).toBeLessThan(initialTemplateCount);

				const finalCollectionText = await pong.templates.getCollectionCountLabel().textContent();
				const finalCollectionCount = parseCount(finalCollectionText);
				expect(finalCollectionCount).toBeLessThan(initialCollectionCount);
			});

			test('should preserve search query in URL', async ({ pong }) => {
				await pong.navigate.toTemplates();
				await expect(pong.templates.getTemplatesLoadingContainer()).toBeHidden();
				await expect(pong.templates.getCategoryFilter(TEST_CATEGORY)).toBeVisible();

				await pong.templates.clickCategoryFilter(TEST_CATEGORY);
				await pong.templates.getSearchInput().fill('auto');

				await expect(pong.page).toHaveURL(/\?categories=/);
				await expect(pong.page).toHaveURL(/&search=/);

				await pong.page.reload();

				await expect(pong.page).toHaveURL(/\?categories=/);
				await expect(pong.page).toHaveURL(/&search=/);

				const salesFilterLabel = pong.templates.getCategoryFilter(TEST_CATEGORY);
				await expect(salesFilterLabel).toBeChecked();
				await expect(pong.templates.getSearchInput()).toHaveValue('auto');

				await expect(pong.templates.getCategoryFilters().nth(1)).toHaveText('Sales');
			});
		});
	},
);
