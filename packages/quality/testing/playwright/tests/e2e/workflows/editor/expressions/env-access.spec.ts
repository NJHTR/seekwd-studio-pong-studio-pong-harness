import { HTTP_REQUEST_NODE_NAME, MANUAL_TRIGGER_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';

const URL_PARAMETER_NAME = 'url';
const ENV_ACCESS_DENIED_MESSAGE = 'access to env vars denied';
const RUN_NODE_TO_RESOLVE_MESSAGE = '[not accessible via UI, please run node]';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'expression-env-access',
			PONG_BLOCK_ENV_ACCESS_IN_NODE: 'false',
			E2E_ENV_PREVIEW_PROBE: 'probe-value',
		},
	},
});

test.describe(
	'$env in the inline expression preview',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong, pongContainer }) => {
			test.skip(
				!pongContainer,
				'container-only: the backend must start with PONG_BLOCK_ENV_ACCESS_IN_NODE set',
			);
			await pong.start.fromBlankCanvas();
		});

		test('does not report env access as denied when the instance allows it', async ({ pong }) => {
			await pong.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await pong.canvas.addNode(HTTP_REQUEST_NODE_NAME, { closeNDV: false });

			await pong.ndv.activateParameterExpressionEditor(URL_PARAMETER_NAME);
			await pong.ndv.getInlineExpressionEditorInput(URL_PARAMETER_NAME).click();
			await pong.ndv.clearExpressionEditor(URL_PARAMETER_NAME);
			await pong.ndv.typeInExpressionEditor('{{ $env.E2E_ENV_PREVIEW_PROBE', URL_PARAMETER_NAME);

			const output = pong.ndv.getInlineExpressionEditorOutput();
			await expect(output).toHaveText(RUN_NODE_TO_RESOLVE_MESSAGE);
			await expect(output).not.toContainText(ENV_ACCESS_DENIED_MESSAGE);
		});
	},
);
