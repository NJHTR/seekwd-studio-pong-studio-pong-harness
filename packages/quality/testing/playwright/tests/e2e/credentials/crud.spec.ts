import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should create a new credential using empty state', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const credentialName = `My awesome Notion account ${nanoid()}`;

			await pong.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: '1234567890' },
				{ name: credentialName, projectId },
			);

			await expect(pong.credentials.cards.getCredentials()).toHaveCount(1);
			await expect(pong.credentials.cards.getCredential(credentialName)).toBeVisible();
		});

		test('should sort credentials', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const credentialA = `A Credential ${nanoid()}`;
			const credentialZ = `Z Credential ${nanoid()}`;

			await pong.api.credentials.createCredential({
				name: credentialA,
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId,
			});

			await pong.api.credentials.createCredential({
				name: credentialZ,
				type: 'trelloApi',
				data: { apiKey: 'test_api_key', apiToken: 'test_api_token' },
				projectId,
			});

			await pong.navigate.toCredentials(projectId);
			await pong.credentials.clearSearch();
			await pong.credentials.sortByNameDescending();

			const firstCardDescending = pong.credentials.cards.getCredentials().first();
			await expect(firstCardDescending).toContainText(credentialZ);

			await pong.credentials.sortByNameAscending();

			const firstCardAscending = pong.credentials.cards.getCredentials().first();
			await expect(firstCardAscending).toContainText(credentialA);
		});

		test('should create credentials from NDV for node with multiple auth options', async ({
			pong,
		}) => {
			await pong.start.fromNewProjectBlankCanvas();
			const credentialName = `My Google Service Account ${nanoid()}`;

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Gmail', { action: 'Send a message' });

			await pong.ndv.clickCreateNewCredential();

			// Gmail has 2 auth options (OAuth2 + Service Account), shown as a dropdown
			await expect(pong.canvas.credentialModal.getModeSelector()).toBeVisible();

			await pong.canvas.credentialModal.selectAuthTypeFromDropdown(/Service Account/);

			// Fill in the Service Account fields and save
			await pong.canvas.credentialModal.addCredential(
				{
					email: 'test@project.iam.gserviceaccount.com',
					privateKey: 'test_private_key',
				},
				{ name: credentialName },
			);

			await expect(pong.ndv.getCredentialSelect()).toHaveValue(credentialName);
		});

		test('should show multiple credential types in the same dropdown', async ({ pong }) => {
			const projectId = await pong.start.fromNewProjectBlankCanvas();
			const serviceAccountCredentialName2 = `OAuth2 Credential ${nanoid()}`;
			const serviceAccountCredentialName = `Service Account Credential ${nanoid()}`;

			await pong.api.credentials.createCredential({
				name: serviceAccountCredentialName2,
				type: 'googleApi',
				data: { email: 'test@service.com', privateKey: 'test_key' },
				projectId,
			});

			await pong.api.credentials.createCredential({
				name: serviceAccountCredentialName,
				type: 'googleApi',
				data: { email: 'test@service.com', privateKey: 'test_key' },
				projectId,
			});

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Gmail', { action: 'Send a message' });

			await pong.ndv.getCredentialSelect().click();
			await expect(pong.ndv.getCredentialOptionByText(serviceAccountCredentialName2)).toBeVisible();
			await expect(pong.ndv.getCredentialOptionByText(serviceAccountCredentialName)).toBeVisible();
			await expect(pong.ndv.credentialDropdownCreateNewCredential()).toBeVisible();
		});

		test('should correctly render required and optional credentials', async ({ pong }) => {
			await pong.start.fromNewProjectBlankCanvas();

			await pong.canvas.addNode('Pipedrive', { trigger: 'On new Pipedrive event' });
			await pong.ndv.selectOptionInParameterDropdown('incomingAuthentication', 'Basic Auth');
			// Pipedrive OAuth2 has Automatic OAuth mode, so the first slot offers quick connect.
			await expect(pong.ndv.getNodeCredentialsQuickConnectEmptyState()).toHaveCount(1);
			await expect(pong.ndv.getNodeCredentialsEmptyState()).toHaveCount(1);

			await pong.ndv.clickCreateNewCredential(0);
			// First credential type has multiple auth options → mode selector visible
			await expect(pong.canvas.credentialModal.getModeSelector()).toBeVisible();
			await pong.canvas.credentialModal.close();

			await pong.ndv.clickCreateNewCredential(1);
			await expect(pong.canvas.credentialModal.getModal()).toBeVisible();
			// Second credential type has single auth option → no mode selector
			await expect(pong.canvas.credentialModal.getModeSelector()).toBeHidden();
			await pong.canvas.credentialModal.close();
		});

		test('should create credentials from NDV for node with no auth options', async ({ pong }) => {
			await pong.start.fromNewProjectBlankCanvas();
			const credentialName = `My Trello Account ${nanoid()}`;

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Trello', { action: 'Create a card' });

			await pong.credentialsComposer.createFromNdv(
				{
					apiKey: 'test_api_key',
					apiToken: 'test_api_token',
				},
				{ name: credentialName },
			);

			await expect(pong.ndv.getCredentialSelect()).toHaveValue(credentialName);
		});

		test('should delete credentials from NDV', async ({ pong }) => {
			await pong.start.fromNewProjectBlankCanvas();
			const credentialName = `Notion Credential ${nanoid()}`;

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion', { action: 'Append a block' });

			await pong.credentialsComposer.createFromNdv(
				{ apiKey: '1234567890' },
				{ name: credentialName },
			);
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(credentialName);

			await pong.canvas.credentialModal.editCredential();
			await pong.canvas.credentialModal.deleteCredential();
			await pong.canvas.credentialModal.confirmDelete();

			await expect(
				pong.notifications.getNotificationByTitleOrContent('Credential deleted'),
			).toBeVisible();

			await expect(pong.ndv.getNodeCredentialsEmptyState()).toBeVisible();
		});

		test('should rename credentials from NDV', async ({ pong }) => {
			await pong.start.fromNewProjectBlankCanvas();
			const initialName = `My Trello Account ${nanoid()}`;
			const renamedName = `Something else ${nanoid()}`;

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Trello', { action: 'Create a card' });

			await pong.credentialsComposer.createFromNdv(
				{
					apiKey: 'test_api_key',
					apiToken: 'test_api_token',
				},
				{ name: initialName },
			);

			await pong.canvas.credentialModal.editCredential();
			await pong.canvas.credentialModal.renameCredential(renamedName);
			await pong.canvas.credentialModal.save();
			await pong.canvas.credentialModal.close();

			await expect(pong.ndv.getCredentialSelect()).toHaveValue(renamedName);
		});

		test('should edit credential for non-standard credential type', async ({ pong }) => {
			await pong.start.fromNewProjectBlankCanvas();
			const initialName = `Adalo Credential ${nanoid()}`;
			const editedName = `Something else ${nanoid()}`;

			await pong.canvas.addNode('AI Agent', { closeNDV: true });
			await pong.canvas.addNode('HTTP Request Tool');

			await pong.ndv.selectOptionInParameterDropdown('authentication', 'Predefined Credential Type');
			await pong.ndv.selectOptionInParameterDropdown('nodeCredentialType', 'Adalo API');

			await pong.credentialsComposer.createFromNdv(
				{
					apiKey: 'test_adalo_key',
					appId: 'test_app_id',
				},
				{ name: initialName },
			);

			await pong.canvas.credentialModal.editCredential();
			await pong.canvas.credentialModal.renameCredential(editedName);
			await pong.canvas.credentialModal.save();
			await pong.canvas.credentialModal.close();

			await expect(pong.ndv.getCredentialSelect()).toHaveValue(editedName);
		});

		test('should set a default credential when adding nodes', async ({ pong }) => {
			const projectId = await pong.start.fromNewProjectBlankCanvas();
			const credentialName = `My awesome Notion account ${nanoid()}`;

			await pong.api.credentials.createCredential({
				name: credentialName,
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId,
			});

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion', { action: 'Append a block' });
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(credentialName);

			const credentials = await pong.api.credentials.getCredentials();
			const credential = credentials.find((c) => c.name === credentialName);
			await pong.api.credentials.deleteCredential(credential!.id);
		});

		test('should set a default credential when editing a node', async ({ pong }) => {
			const projectId = await pong.start.fromNewProjectBlankCanvas();
			const credentialName = `My awesome Notion account ${nanoid()}`;

			await pong.api.credentials.createCredential({
				name: credentialName,
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId,
			});

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('HTTP Request');

			await pong.ndv.selectOptionInParameterDropdown('authentication', 'Predefined Credential Type');
			await pong.ndv.selectOptionInParameterDropdown('nodeCredentialType', 'Notion API');
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(credentialName);

			const credentials = await pong.api.credentials.getCredentials();
			const credential = credentials.find((c) => c.name === credentialName);
			await pong.api.credentials.deleteCredential(credential!.id);
		});

		test('should setup generic authentication for HTTP node', async ({ pong }) => {
			await pong.start.fromNewProjectBlankCanvas();
			const credentialName = `Query Auth Credential ${nanoid()}`;

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('HTTP Request');

			await pong.ndv.selectOptionInParameterDropdown('authentication', 'Generic Credential Type');
			await pong.ndv.selectOptionInParameterDropdown('genericAuthType', 'Query Auth');

			await pong.credentialsComposer.createFromNdv(
				{
					name: 'api_key',
					value: 'test_query_value',
				},
				{ name: credentialName },
			);

			await expect(pong.ndv.getCredentialSelect()).toHaveValue(credentialName);
		});

		test('should not show OAuth redirect URL section when OAuth2 credentials are overridden', async ({
			pong,
		}) => {
			// Mock credential types response to simulate admin override
			await pong.page.route('**/rest/types/credentials.json', async (route) => {
				const response = await route.fetch();
				const json = await response.json();

				// Override Slack OAuth2 credential properties
				if (json.slackOAuth2Api) {
					json.slackOAuth2Api.__overwrittenProperties = ['clientId', 'clientSecret'];
				}

				await route.fulfill({ json });
			});

			await pong.start.fromNewProjectBlankCanvas();

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Slack', { action: 'Get a channel' });

			await pong.ndv.clickCreateNewCredential();

			// With overridden OAuth2 properties, the mode selector shows a dropdown
			// with Managed OAuth2 selected by default — redirect URL should be hidden
			await expect(pong.canvas.credentialModal.getModeSelector()).toBeVisible();
			await expect(pong.canvas.credentialModal.getOAuthRedirectUrl()).toBeHidden();
			await expect(pong.canvas.credentialModal.getModal()).toBeVisible();
		});

		test('ADO-2583 should show notifications above credential modal overlay', async ({ pong }) => {
			await pong.page.route('**/rest/credentials', async (route) => {
				if (route.request().method() === 'POST') {
					await route.abort('failed');
				} else {
					await route.continue();
				}
			});

			const projectId = await pong.start.fromNewProject();
			await pong.navigate.toCredentials(projectId);
			await pong.credentials.addResource.credential();
			await pong.credentials.selectCredentialType('Notion API');
			await pong.canvas.credentialModal.fillField('apiKey', '1234567890');

			const saveBtn = pong.canvas.credentialModal.getSaveButton();
			await saveBtn.click();

			const errorNotification = pong.notifications.getErrorNotifications();
			await expect(errorNotification).toBeVisible();
			await expect(pong.canvas.credentialModal.getModal()).toBeVisible();

			await expect(errorNotification).toHaveCSS('z-index', '2100');
			await expect(pong.notifications.getModalOverlay()).toHaveCSS('z-index', '2001');
		});
	},
);
