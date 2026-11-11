import {
	SCHEDULE_TRIGGER_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
} from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import type { pongPage } from '../../../../../pages/pongPage';

/**
 * Runs the editor on the QuickJS engine. Without this the container keeps the
 * `legacy` default, and every assertion here would pass on the wrong engine —
 * the two evaluators resolve the same expressions.
 */
test.use({ capability: { env: { PONG_EXPRESSION_ENGINE_FRONTEND: 'quickjs' } } });

const SCHEDULE_PARAMETER_NAME = 'daysInterval';

/** The counter the probe keeps on the page under test. */
type ProbeWindow = Window & { wasmInstantiations: number };

async function addEditFields(pong: pongPage): Promise<void> {
	await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME);
	await pong.ndv.getAssignmentCollectionAdd('assignments').click();
	await pong.ndv.clickAssignmentExpressionToggle('assignments');
}

test.describe(
	'QuickJS expression engine',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			// A local run points at an instance this harness does not configure, so
			// the engine is whatever the developer started.
			const engine = await pong.api.getFrontendExpressionEngine();
			test.skip(engine !== 'quickjs', 'instance does not run the quickjs frontend engine');
		});

		test('evaluates through the wasm runtime, not the legacy evaluator', async ({ pong }) => {
			// `pong.page` is the page the fixture drives. The bare `page` fixture is a
			// second, blank one in the same context, and sees none of this traffic.
			const page = pong.page;

			await page.addInitScript(() => {
				const probe = window as unknown as ProbeWindow;
				probe.wasmInstantiations = 0;
				for (const name of ['instantiate', 'instantiateStreaming'] as const) {
					const original = WebAssembly[name];
					// @ts-expect-error the probe replaces the host global on purpose
					WebAssembly[name] = function (...args: unknown[]) {
						probe.wasmInstantiations++;
						// @ts-expect-error forwarding through the replaced global
						return original.apply(WebAssembly, args);
					};
				}
			});
			// The fixture already loaded the app, so the init script needs a fresh load.
			await page.reload();

			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await pong.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('3');

			const instantiations = await page.evaluate(
				() => (window as unknown as ProbeWindow).wasmInstantiations,
			);
			expect(instantiations, 'the page instantiated the QuickJS wasm module').toBeGreaterThan(0);
		});

		test('resolves $json with pong extensions, and the backend agrees', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await pong.ndv.setPinnedData([{ myStr: 'Monday Morning' }]);
			await pong.ndv.close();

			await addEditFields(pong);
			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor('{{$json.myStr.toSnakeCase()}}');

			// The preview runs in the browser on QuickJS.
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toContainText('monday_morning');

			// The execution runs on the backend engine. Both must agree, or the two
			// evaluators have drifted.
			await pong.ndv.execute();
			await expect(pong.ndv.getOutputDataContainer()).toBeVisible();
			await expect(pong.ndv.getOutputDataContainer()).toContainText('monday_morning');
		});

		test('resolves luxon and Intl through the host bridge', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await pong.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);

			// QuickJS ships without ECMA-402, so Intl is delegated to the host.
			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor("{{ new Intl.NumberFormat('de-DE').format(1234.5)");
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('1.234,5');

			// Luxon reaches the same bridge for its locale and zone data.
			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor(
				"{{ DateTime.fromISO('2024-03-05').toFormat('yyyy LLLL dd')",
			);
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('2024 March 05');
		});

		test('keeps resolving after the node view is reopened', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(SCHEDULE_TRIGGER_NODE_NAME);
			await pong.ndv.activateParameterExpressionEditor(SCHEDULE_PARAMETER_NAME);
			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor('{{ 1 + 2');
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('3');
			await pong.ndv.close();

			// The editor builds a new Expression for the reopened view. It has to
			// evaluate without acquiring a bridge of its own.
			await pong.canvas.openNode(SCHEDULE_TRIGGER_NODE_NAME);
			await pong.ndv.clearExpressionEditor();
			await pong.ndv.typeInExpressionEditor("{{ 'abc'.toUpperCase()");
			await expect(pong.ndv.getInlineExpressionEditorOutput()).toHaveText('ABC');
		});
	},
);
