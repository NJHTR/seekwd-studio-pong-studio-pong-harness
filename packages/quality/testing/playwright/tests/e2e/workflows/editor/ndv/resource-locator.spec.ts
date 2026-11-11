import { E2E_TEST_NODE_NAME } from '../../../../../config/constants';
import { test, expect } from '../../../../../fixtures/base';
import { MessageBox } from '../../../../../pages/components/messageBoxLocators';

const NO_CREDENTIALS_MESSAGE = 'Add your credential';
const INVALID_CREDENTIALS_MESSAGE = 'Check your credential';
const MODE_SELECTOR_LIST = 'From list';

test.describe(
	'Resource Locator',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			// Each test gets its own project so credentials created in one test
			// (e.g. the unconnected OAuth credential below) cannot auto-attach to
			// nodes in concurrently running tests of this file.
			await pong.start.fromNewProjectBlankCanvas();
		});

		test('should render both RLC components in google sheets', async ({ pong }) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

			await expect(pong.ndv.getResourceLocator('documentId')).toBeVisible();
			await expect(pong.ndv.getResourceLocator('sheetName')).toBeVisible();
			await expect(pong.ndv.getResourceLocatorModeSelectorInput('documentId')).toHaveValue(
				MODE_SELECTOR_LIST,
			);
			await expect(pong.ndv.getResourceLocatorModeSelectorInput('sheetName')).toHaveValue(
				MODE_SELECTOR_LIST,
			);
		});

		test('should show appropriate error when credentials are not set', async ({ pong }) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

			await expect(pong.ndv.getResourceLocator('documentId')).toBeVisible();

			await pong.ndv.getResourceLocatorInput('documentId').click();

			await expect(pong.ndv.getResourceLocatorErrorMessage('documentId')).toContainText(
				NO_CREDENTIALS_MESSAGE,
			);
		});

		test('should show create credentials modal when clicking "add your credential"', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

			await expect(pong.ndv.getResourceLocator('documentId')).toBeVisible();

			await pong.ndv.getResourceLocatorInput('documentId').click();

			await expect(pong.ndv.getResourceLocatorErrorMessage('documentId')).toContainText(
				NO_CREDENTIALS_MESSAGE,
			);

			await pong.ndv.getResourceLocatorAddCredentials('documentId').click();

			await expect(pong.canvas.credentialModal.getModal()).toBeVisible();
		});

		test('should show appropriate error when credentials are not valid', async ({ pong }) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

			// Add OAuth2 credentials without connecting
			await pong.ndv.clickCreateNewCredential();

			await expect(pong.canvas.credentialModal.getModal()).toBeVisible();

			await pong.canvas.credentialModal.fillAllFields({
				clientId: 'dummy-client-id',
				clientSecret: 'dummy-client-secret',
			});

			// OAuth: Save button is hidden. Click Connect to trigger implicit save.
			const credentialSaved = pong.page.waitForResponse(
				(resp) => resp.url().includes('/rest/credentials') && resp.request().method() === 'POST',
			);
			const popupPromise = pong.page.context().waitForEvent('page');
			await pong.canvas.credentialModal.oauthConnectButton.click();
			await credentialSaved;
			const popup = await popupPromise;
			await popup.close();

			await pong.canvas.credentialModal.close();
			// Close warning modal about not connecting the OAuth credentials
			const closeButton = new MessageBox(pong.page).buttonByText('Close');
			await closeButton.click();

			await pong.ndv.getResourceLocatorInput('documentId').click();

			await expect(pong.ndv.getResourceLocatorErrorMessage('documentId')).toContainText(
				INVALID_CREDENTIALS_MESSAGE,
			);
		});

		test('should show appropriate errors when search filter is required', async ({ pong }) => {
			await pong.canvas.addNode('GitHub', { closeNDV: false, trigger: 'On pull request' });

			await expect(pong.ndv.getResourceLocator('owner')).toBeVisible();
			await pong.ndv.getResourceLocatorInput('owner').click();

			await expect(pong.ndv.getResourceLocatorErrorMessage('owner')).toContainText(
				NO_CREDENTIALS_MESSAGE,
			);
		});

		test('should reset resource locator when dependent field is changed', async ({ pong }) => {
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Google Sheets', { closeNDV: false, action: 'Update row in sheet' });

			await pong.ndv.setRLCValue('documentId', '123');
			await pong.ndv.setRLCValue('sheetName', '123', 1);
			await pong.ndv.setRLCValue('documentId', '321');

			await expect(pong.ndv.getResourceLocatorInputField('sheetName')).toHaveValue('');
		});

		// unlike RMC and remote options, RLC does not support loadOptionDependsOn
		test('should retrieve list options when other params throw errors', async ({ pong }) => {
			await pong.canvas.addNode(E2E_TEST_NODE_NAME, { closeNDV: false, action: 'Resource Locator' });

			await pong.ndv.getResourceLocatorInput('rlc').click();

			// A page of list options is 5 items. The dropdown auto-fetches a second
			// page when the first one doesn't fill the viewport, so assert a full
			// first page is visible rather than an exact total count. Assert a
			// popper is present (not an exact count) — unrelated tooltips (e.g. the
			// error tooltip induced below) also match the visible-popper selector,
			// so requiring exactly one is flaky.
			await expect(pong.ndv.getVisiblePopper().first()).toBeVisible();
			await expect(pong.ndv.getResourceLocatorItems().nth(4)).toBeVisible();

			await pong.ndv.setInvalidExpression({ fieldName: 'fieldId' });

			await pong.ndv.getInputPanel().click(); // remove focus from input, hide expression preview

			// wait for the expression to be evaluated and show the error
			await expect(pong.ndv.getParameterInputHint()).toContainText('ERROR');

			await pong.ndv.getResourceLocatorInput('rlc').click();

			await expect(pong.ndv.getVisiblePopper().first()).toBeVisible();
			await expect(pong.ndv.getResourceLocatorItems().nth(4)).toBeVisible();
		});
	},
);
