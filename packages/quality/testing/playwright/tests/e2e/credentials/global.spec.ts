import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'global-credentials' } } });

test.describe(
	'Global credentials',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test.beforeAll(async ({ api }) => {
			await api.enableFeature('sharing');
		});

		test('owner should create HTTP header credential and set to global', async ({ pong }) => {
			await pong.api.signin('owner');

			// Navigate to credentials page
			await pong.navigate.toCredentials();

			// Create new credential
			await pong.credentials.addResource.credential();
			await pong.credentials.selectCredentialType('Header Auth');

			// Fill in credential fields
			await pong.credentials.credentialModal.fillField('name', 'Authorization');
			await pong.credentials.credentialModal.fillField('value', 'Bearer test-token-123');

			// Set credential name
			await pong.credentials.credentialModal.getCredentialName().click();
			await pong.credentials.credentialModal.getNameInput().fill('Global HTTP Header Cred');

			// Switch to Sharing tab
			await pong.credentials.credentialModal.changeTab('Sharing');

			// Share with all users (set to global)
			await pong.credentials.credentialModal.addUserToSharing('All users');

			// Save the credential with sharing
			await pong.credentials.credentialModal.save();
			await pong.credentials.credentialModal.close();

			// Verify credential appears in list with global badge
			await expect(pong.credentials.cards.getCredential('Global HTTP Header Cred')).toBeVisible();
			await expect(
				pong.credentials.cards.getCredentialGlobalBadge('Global HTTP Header Cred'),
			).toBeVisible();
		});

		test('member should see global credential in credentials view', async ({ pong }) => {
			await pong.api.signin('member', 0);

			// Navigate to credentials page
			await pong.navigate.toCredentials();

			// Verify global credential is visible to member
			await expect(pong.credentials.cards.getCredential('Global HTTP Header Cred')).toBeVisible();

			// Verify global badge is displayed
			await expect(
				pong.credentials.cards.getCredentialGlobalBadge('Global HTTP Header Cred'),
			).toBeVisible();
		});

		test('member should execute workflow with HTTP node using global credential', async ({
			pong,
			internalUrl,
		}) => {
			await pong.api.signin('member', 0);

			// Create a new workflow
			await pong.navigate.toWorkflow('new');
			await pong.canvas.setWorkflowName('Test Global Credential Workflow');

			// Add manual trigger and HTTP Request node
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('HTTP Request');

			// pong calls this URL, not the browser, so it must resolve from inside the
			// stack - under container projects the request leaves a worker container.
			await pong.ndv.fillParameterInput('URL', `${internalUrl}/rest/settings`);
			await pong.ndv.selectOptionInParameterDropdown('authentication', 'Generic Credential Type');
			await pong.ndv.selectOptionInParameterDropdown('genericAuthType', 'Header Auth');

			// Verify global credential is available in the credential select
			const credentialSelect = pong.ndv.getCredentialSelect();
			await credentialSelect.click();

			// Check that global credential appears in dropdown
			await expect(
				pong.credentials.credentialModal.getVisibleDropdownOption('Global HTTP Header Cred'),
			).toBeVisible();

			// Select the global credential
			await pong.credentials.credentialModal
				.getVisibleDropdownOption('Global HTTP Header Cred')
				.click();

			// Verify credential is selected
			await expect(credentialSelect).toHaveValue('Global HTTP Header Cred');

			// Close NDV
			await pong.ndv.clickBackToCanvasButton();

			await pong.workflowComposer.executeWorkflowAndWaitForNotification(
				'Workflow executed successfully',
			);
		});

		test('owner should be able to remove global sharing', async ({ pong }) => {
			await pong.api.signin('owner');

			// Navigate to credentials page
			await pong.navigate.toCredentials();

			// Open the global credential
			await pong.credentials.cards.getCredential('Global HTTP Header Cred').click();

			// Switch to Sharing tab
			await pong.credentials.credentialModal.changeTab('Sharing');

			// Verify "All users" is in the sharing list
			await expect(pong.credentials.credentialModal.getSharingListItem('All users')).toBeVisible();

			// Remove global sharing by clicking the remove button
			await pong.credentials.credentialModal.removeUserFromSharing('All users');

			// Save the changes
			await pong.credentials.credentialModal.save();
			await pong.credentials.credentialModal.close();

			// Verify global badge is no longer visible
			await expect(
				pong.credentials.cards.getCredentialGlobalBadge('Global HTTP Header Cred'),
			).toBeHidden();
		});

		test('member should not see credential after global sharing removed', async ({ pong }) => {
			await pong.api.signin('member', 0);

			// Navigate to credentials page
			await pong.navigate.toCredentials();

			// Verify credential is no longer visible to member
			await expect(pong.credentials.cards.getCredential('Global HTTP Header Cred')).toBeHidden();
		});
	},
);
