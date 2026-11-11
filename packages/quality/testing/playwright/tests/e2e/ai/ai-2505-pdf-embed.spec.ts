import { test } from '../../../fixtures/base';

test.use({ capability: { env: { PONG_DEPRECATED_NODES_BLOCK: 'false' } } });

/**
 * Regression guard for AI-2505 — PDF embedding via Default Data Loader →
 * In-Memory Vector Store insert was throwing
 *   "Failed to load pdf-parse. This loader currently supports pdf-parse v1 only…"
 * because @langchain/community's PDFLoader resolved pdf-parse@2 in the
 * @pong/ai-utilities install context.
 *
 * The fix replaces LangChain's PDFLoader with PongPdfLoader (pdf-parse@2 backed).
 * This test exercises the end-to-end path on the real pong runtime, using
 * FakeEmbeddings so the workflow can complete without external API keys.
 */
test.describe(
	'AI-2505 — PDF embed regression',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('embeds a PDF through Default Data Loader → In-Memory Vector Store without the pdf-parse v1 error', async ({
			pong,
		}) => {
			await pong.start.fromImportedWorkflow('AI-2505_pdf_embed_fake_embeddings.json');
			await pong.canvas.clickZoomToFitButton();
			await pong.canvas.deselectAll();

			// Partial execution up to and including the Vector Store node —
			// mirrors the proven pattern in langchain-vectorstores.spec.ts and
			// avoids any flakiness around full-workflow trigger plumbing.
			await pong.canvas.executeNode('Populate VS');

			// If PDF parsing fails (the AI-2505 regression), no success
			// notification ever appears and this assertion times out.
			await pong.notifications.waitForNotificationAndClose('Node executed successfully', {
				timeout: 30000,
			});
		});
	},
);
