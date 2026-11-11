import { readFileSync } from 'fs';

import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';
import { resolveFromRoot } from '../../../utils/path-helper';

test.use({ capability: { env: { TEST_ISOLATION: 'template-setup-experiment' } } });

const TEMPLATE_HOSTNAME = 'custom.template.host';
const TEMPLATE_HOST = `https://${TEMPLATE_HOSTNAME}/api`;
const TEMPLATE_ID = 1205;

const testTemplate = JSON.parse(
	readFileSync(resolveFromRoot('workflows', 'Test_Template_1.json'), 'utf8'),
);

function createTemplateRequirements(): TestRequirements {
	return {
		storage: {
			PONG_EXPERIMENT_OVERRIDES: JSON.stringify({
				'055_template_setup_experience': 'variant',
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
			health: {
				url: `${TEMPLATE_HOST}/health`,
				response: { status: 'OK' },
			},
			categories: {
				url: `${TEMPLATE_HOST}/templates/categories`,
				response: { categories: [] },
			},
			getTemplatePreview: {
				url: `${TEMPLATE_HOST}/templates/workflows/${TEMPLATE_ID}`,
				response: testTemplate,
			},
			getTemplate: {
				url: `${TEMPLATE_HOST}/workflows/templates/${TEMPLATE_ID}`,
				response: {
					id: TEMPLATE_ID,
					name: testTemplate.workflow.name,
					workflow: testTemplate.workflow.workflow,
				},
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

		test('Should take users to canvas when importing template', async ({ pong }) => {
			await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
			await expect(pong.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });

			await expect(pong.page).toHaveURL(/\/workflow\/.+\?templateId=.+&new=true/);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);
			await expect(pong.templateCredentialSetup.getCanvasSetupButton()).toBeVisible();
		});

		test('Loads template setup modal correctly', async ({ pong }) => {
			await pong.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
			await expect(pong.canvas.getLoadingMask()).toBeHidden({ timeout: 30000 });

			await expect(pong.page).toHaveURL(/\/workflow\/.+\?templateId=.+&new=true/);
			await expect(pong.canvas.getCanvasNodes()).toHaveCount(3);

			// In the variant experiment, the setup modal auto-opens on mount of
			// SetupWorkflowCredentialsButton when arriving on the template import route.
			// Wait for the auto-opened modal rather than clicking the button — the
			// click races with the auto-open and can be intercepted by the modal.
			await expect(pong.templateCredentialSetup.getCanvasCredentialModal()).toBeVisible();

			const modalSteps = pong.templateCredentialSetup.getSetupCredentialModalSteps();
			await expect(modalSteps).toHaveCount(3);
			await expect(modalSteps.nth(0)).toContainText('Shopify');
			await expect(modalSteps.nth(1)).toContainText('X (Formerly Twitter)');
			await expect(modalSteps.nth(2)).toContainText('Telegram');
		});
	},
);
