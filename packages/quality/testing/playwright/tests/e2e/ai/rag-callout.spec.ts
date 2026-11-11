import { test, expect } from '../../../fixtures/base';

test.describe(
	'RAG callout experiment',
	{
		annotation: [{ type: 'owner', description: 'Agent' }],
	},
	() => {
		test.describe('NDV callout', () => {
			test('should show callout and open template on click', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.addNode('Zep Vector Store', {
					action: 'Add documents to vector store',
					closeNDV: false,
				});

				await expect(pong.canvas.getRagCalloutTip()).toBeVisible();

				const popupPromise = pong.page.waitForEvent('popup');
				await pong.canvas.clickRagTemplateLink();

				const popup = await popupPromise;
				expect(popup.url()).toContain('/workflows/templates/rag-starter-template?fromJson=true');

				await popup.close();
			});
		});

		test.describe('search callout', () => {
			test('should show callout and open template on click', async ({ pong }) => {
				await pong.start.fromBlankCanvas();
				await pong.canvas.clickNodeCreatorPlusButton();
				await pong.canvas.fillNodeCreatorSearchBar('rag');

				const popupPromise = pong.page.waitForEvent('popup');
				await expect(pong.canvas.getRagTemplateLink()).toBeVisible();
				await pong.canvas.clickRagTemplateLink();

				const popup = await popupPromise;
				expect(popup.url()).toContain('/workflows/templates/rag-starter-template?fromJson=true');

				await popup.close();
			});
		});
	},
);
