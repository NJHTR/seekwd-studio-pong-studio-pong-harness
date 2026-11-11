import { readFileSync } from 'fs';

import { test, expect } from '../../../../fixtures/base';
import type { TestRequirements } from '../../../../Types';
import { resolveFromRoot } from '../../../../utils/path-helper';

test.use({ capability: { env: { TEST_ISOLATION: 'template-credentials-setup' } } });

const TEMPLATE_HOST = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
const TEMPLATE_ID = 1205;
const TEMPLATE_WITHOUT_CREDS_ID = 1344;
const COLLECTION_ID = 1;

const testTemplate = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_1.json'), 'utf8'),
);

const templateWithoutCredentials = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_2.json'), 'utf8'),
);

const ecommerceCollection = JSON.parse(
	readFileSync(
		resolveFromRoot('workflows', 'Ecommerce_starter_pack_template_collection.json'),
		'utf8',
	),
);

function createTemplateRequirements(): TestRequirements {
	return {
		storage: {
			PONG_EXPERIMENT_OVERRIDES: JSON.stringify({
				'055_template_setup_experience': 'control',
				'069_setup_panel': 'control',
			}),
		},
		config: {
			settings: {
				templates: {
					enabled: true,
					host: TEMPLATE_HOST,
				},
			},
		},
		intercepts: {
			getTemplatePreview: {
				url: `${TEMPLATE_HOST}templates/workflows/${TEMPLATE_ID}`,
				response: testTemplate,
			},
			getTemplate: {
				url: `${TEMPLATE_HOST}workflows/templates/${TEMPLATE_ID}`,
				response: testTemplate.workflow,
			},
			getTemplateCollection: {
				url: `${TEMPLATE_HOST}templates/collections/${COLLECTION_ID}`,
				response: ecommerceCollection,
			},
		},
	};
}

test.describe(
	'Template credentials setup @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(createTemplateRequirements());
		});

		test('can be opened from template collection page', async ({ pong }) => {
			await pong.navigate.toTemplateCollection(COLLECTION_ID);
			await pong.templates.clickUseWorkflowButton('Promote new Shopify products');

			await expect(
				pong.templateCredentialSetup.getTitle("Set up 'Promote new Shopify products' template"),
			).toBeVisible();
		});

		test('has all the elements on page', async ({ pong }) => {
			await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

			await expect(
				pong.templateCredentialSetup.getTitle("Set up 'Promote new Shopify products' template"),
			).toBeVisible();

			await expect(pong.templateCredentialSetup.getInfoCallout()).toContainText(
				'You need 1x Shopify, 1x X (Formerly Twitter) and 1x Telegram account to setup this template',
			);

			const expectedAppNames = ['1. Shopify', '2. X (Formerly Twitter)', '3. Telegram'];
			const expectedAppDescriptions = [
				'The credential you select will be used in the product created node of the workflow template.',
				'The credential you select will be used in the Twitter node of the workflow template.',
				'The credential you select will be used in the Telegram node of the workflow template.',
			];

			const formSteps = pong.templateCredentialSetup.getFormSteps();
			const count = await formSteps.count();

			for (let i = 0; i < count; i++) {
				const step = formSteps.nth(i);
				await expect(pong.templateCredentialSetup.getStepHeading(step)).toHaveText(
					expectedAppNames[i],
				);
				await expect(pong.templateCredentialSetup.getStepDescription(step)).toHaveText(
					expectedAppDescriptions[i],
				);
			}
		});

		test('can skip template creation', async ({ pong }) => {
			await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

			await pong.templateCredentialSetup.getSkipLink().click();

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
		});

		test('can create credentials and workflow from the template', async ({ pong }) => {
			await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);

			await expect(pong.templateCredentialSetup.getContinueButton()).toBeDisabled();

			await pong.templatesComposer.fillDummyCredentialForApp('Shopify', {
				fields: { shopSubdomain: 'test-shop', apiKey: 'test-token', password: 'test-key' },
			});

			await expect(pong.templateCredentialSetup.getContinueButton()).toBeEnabled();

			await pong.templatesComposer.fillDummyCredentialForOAuthApp('X (Formerly Twitter)', {
				fields: { consumerKey: 'consumer-key', consumerSecret: 'consumer-secret' },
			});
			await pong.templatesComposer.fillDummyCredentialForApp('Telegram', {
				fields: { accessToken: 'bot-token' },
			});

			await pong.notifications.quickCloseAll();

			const workflowCreatePromise = pong.page.waitForResponse('**/rest/workflows');
			await pong.templateCredentialSetup.getContinueButton().click();
			await workflowCreatePromise;

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);

			const workflow = await pong.canvasComposer.getWorkflowFromClipboard();

			expect(workflow.meta).toHaveProperty('templateId', TEMPLATE_ID.toString());
			expect(workflow.meta).not.toHaveProperty('templateCredsSetupCompleted');
			workflow.nodes.forEach((node: { credentials?: Record<string, unknown> }) => {
				expect(Object.keys(node.credentials ?? {})).toHaveLength(1);
			});
		});

		test('should work with a template that has no credentials (ADO-1603)', async ({
			pong,
			setupRequirements,
		}) => {
			await setupRequirements({
				storage: {
					PONG_EXPERIMENT_OVERRIDES: JSON.stringify({
						'055_template_setup_experience': 'control',
						'069_setup_panel': 'control',
					}),
				},
				config: {
					settings: {
						templates: {
							enabled: true,
							host: TEMPLATE_HOST,
						},
					},
				},
				intercepts: {
					getTemplatePreview: {
						url: `${TEMPLATE_HOST}templates/workflows/${TEMPLATE_WITHOUT_CREDS_ID}`,
						response: templateWithoutCredentials,
					},
					getTemplate: {
						url: `${TEMPLATE_HOST}workflows/templates/${TEMPLATE_WITHOUT_CREDS_ID}`,
						response: templateWithoutCredentials.workflow,
					},
				},
			});

			await pong.navigate.toTemplateCredentialSetup(TEMPLATE_WITHOUT_CREDS_ID);

			const expectedAppNames = ['1. Email (IMAP)', '2. Nextcloud'];
			const expectedAppDescriptions = [
				'The credential you select will be used in the IMAP Email node of the workflow template.',
				'The credential you select will be used in the Nextcloud node of the workflow template.',
			];

			const formSteps = pong.templateCredentialSetup.getFormSteps();
			const count = await formSteps.count();

			for (let i = 0; i < count; i++) {
				const step = formSteps.nth(i);
				await expect(pong.templateCredentialSetup.getStepHeading(step)).toHaveText(
					expectedAppNames[i],
				);
				await expect(pong.templateCredentialSetup.getStepDescription(step)).toHaveText(
					expectedAppDescriptions[i],
				);
			}

			await expect(pong.templateCredentialSetup.getContinueButton()).toBeDisabled();

			await pong.templatesComposer.fillDummyCredentialForApp('Email (IMAP)');
			await pong.templatesComposer.fillDummyCredentialForApp('Nextcloud');

			await pong.notifications.quickCloseAll();

			const workflowCreatePromise = pong.page.waitForResponse('**/rest/workflows');
			await pong.templateCredentialSetup.getContinueButton().click();
			await workflowCreatePromise;

			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
		});

		test.describe('Credential setup from workflow editor', () => {
			test('should allow credential setup from workflow editor if user skips it during template setup', async ({
				pong,
			}) => {
				await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
				await pong.templateCredentialSetup.getSkipLink().click();

				await expect(pong.canvas.getSetupWorkflowCredentialsButton()).toBeVisible();
			});

			test('should allow credential setup from workflow editor if user fills in credentials partially during template setup', async ({
				pong,
			}) => {
				await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
				await pong.templatesComposer.fillDummyCredentialForApp('Shopify', {
					fields: { shopSubdomain: 'test-shop', apiKey: 'test-token', password: 'test-key' },
				});

				await pong.notifications.quickCloseAll();

				const workflowCreatePromise = pong.page.waitForResponse('**/rest/workflows');
				await pong.templateCredentialSetup.getContinueButton().click();
				await workflowCreatePromise;

				await expect(pong.canvas.getSetupWorkflowCredentialsButton()).toBeVisible();
			});

			test('should fill credentials from workflow editor', async ({ pong }) => {
				await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
				await pong.templateCredentialSetup.getSkipLink().click();

				await pong.canvas.getSetupWorkflowCredentialsButton().click();
				await expect(pong.workflowCredentialSetupModal.container).toBeVisible();

				await pong.templatesComposer.fillDummyCredentialForApp('Shopify', {
					fields: { shopSubdomain: 'test-shop', apiKey: 'test-token', password: 'test-key' },
				});
				await pong.templatesComposer.fillDummyCredentialForOAuthApp('X (Formerly Twitter)', {
					fields: { consumerKey: 'consumer-key', consumerSecret: 'consumer-secret' },
				});
				await pong.templatesComposer.fillDummyCredentialForApp('Telegram', {
					fields: { accessToken: 'bot-token' },
				});

				await pong.notifications.quickCloseAll();

				await pong.workflowCredentialSetupModal.clickContinue();
				await expect(pong.workflowCredentialSetupModal.container).toBeHidden();

				const workflow = await pong.canvasComposer.getWorkflowFromClipboard();

				workflow.nodes.forEach((node: { credentials?: Record<string, unknown> }) => {
					expect(Object.keys(node.credentials ?? {})).toHaveLength(1);
				});

				await expect(pong.canvas.getSetupWorkflowCredentialsButton()).toBeHidden();
			});
		});
	},
);
