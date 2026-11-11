import { expect, test } from '../../../../fixtures/base';

test.use({ capability: 'external-secrets' });

// LocalStack can take time to start up, and connection tests add latency
test.setTimeout(180_000);

// LocalStack test credentials (AWS_ENDPOINT_URL in the pong container redirects all SDK calls to LocalStack)
const LOCALSTACK_AWS_SETTINGS = {
	region: 'us-east-1',
	authMethod: 'iamUser',
	accessKeyId: 'test',
	secretAccessKey: 'test',
} as const;

const INVALID_AWS_SETTINGS_REGION = 'us-east/1';

test.describe(
	'Secret Providers Connections UI @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.beforeEach(async ({ pong, services }) => {
			await pong.api.enableFeature('externalSecrets');
			await services.localstack.secretsManager.clear();
		});

		/**
		 * Creates a global connection via the UI settings page, verifies the success
		 * callout and global badge, creates a credential referencing a secret from
		 * the provider, then deletes the connection through the UI delete flow.
		 */
		test('should create a global connection via UI and reference it in a credential', async ({
			pong,
			services,
		}) => {
			const providerName = 'awsGlobal';

			await services.localstack.secretsManager.createSecret('apikey', 'supersecret');

			await pong.navigate.toExternalSecrets();
			await pong.secretsProviderSettings.waitForProvidersLoaded();
			await expect(pong.secretsProviderSettings.getEmptyState()).toBeVisible();

			await pong.secretsProviderSettings.clickEmptyStateAddButton();
			await pong.secretsProviderConnectionModal.waitForModal();

			await pong.secretsProviderConnectionModal.fillConnectionName(providerName);
			await pong.secretsProviderConnectionModal.selectProviderType('AWS Secrets Manager');
			await pong.secretsProviderConnectionModal.fillProviderField(
				'region',
				LOCALSTACK_AWS_SETTINGS.region,
			);
			await pong.secretsProviderConnectionModal.fillProviderField(
				'accessKeyId',
				LOCALSTACK_AWS_SETTINGS.accessKeyId,
			);
			await pong.secretsProviderConnectionModal.fillProviderField(
				'secretAccessKey',
				LOCALSTACK_AWS_SETTINGS.secretAccessKey,
			);

			await pong.secretsProviderConnectionModal.save();
			await expect(pong.secretsProviderConnectionModal.getSuccessCallout()).toBeVisible();
			await pong.secretsProviderConnectionModal.close();

			await expect(pong.secretsProviderSettings.getProviderNameCard(providerName)).toBeVisible();
			await expect(
				pong.secretsProviderSettings.getProviderCardGlobalBadge(providerName),
			).toBeVisible();

			const credentialName = 'Secret Ref Header Auth';
			await pong.navigate.toCredentials();
			await pong.credentials.emptyListCreateCredentialButton.click();
			await pong.credentials.selectCredentialType('Header Auth');
			await pong.credentials.credentialModal.waitForModal();
			await pong.credentials.credentialModal.renameCredential(credentialName);
			// plain text, not expression mode
			await pong.credentials.credentialModal.fillField('name', 'Authorization');
			// expression mode, referencing the external secret
			await pong.credentials.credentialModal.fillExpressionField(
				'value',
				`{{ $secrets['${providerName}']['apikey'] }}`,
			);
			await expect(pong.credentials.credentialModal.getParameterInputHint()).toContainText(
				'*********',
			);
			await pong.credentials.credentialModal.save();
			await pong.credentials.credentialModal.close();

			await expect(pong.credentials.cards.getCredential(credentialName)).toBeVisible();

			await pong.navigate.toExternalSecrets();
			await pong.secretsProviderSettings.waitForProvidersLoaded();
			await pong.secretsProviderSettings.selectCardAction(providerName, 'Delete');
			await pong.deleteSecretsProviderModal.waitForModal();

			// The credential references this provider, so the user must type the exact provider
			// name into the confirmation input to enable the delete button.
			await pong.deleteSecretsProviderModal.fillConfirmation(providerName);
			await pong.deleteSecretsProviderModal.confirmDelete();

			await expect(pong.secretsProviderSettings.getEmptyState()).toBeVisible();
			await expect(pong.secretsProviderSettings.getProviderNameCard(providerName)).toBeHidden();
		});

		/**
		 * Creates a global connection via the UI settings page,
		 * creates a connection with invalid region then saves it and verifies that the error banner is shown.
		 * Scopes it to a project and verifies that the connection appears in the project settings and can be referenced from a project credential.
		 */
		test('should create a connection, recover a wrong setting, scope it to a project, and use it in a project credential', async ({
			pong,
			services,
		}) => {
			const providerName = 'awsGlobalRecovery';

			await services.localstack.secretsManager.createSecret('projectsecret', 'projectvalue');

			const project = await pong.api.projects.createProject('SecretProject');
			const projectId = project.id;

			await pong.navigate.toExternalSecrets();
			await pong.secretsProviderSettings.waitForProvidersLoaded();
			await expect(pong.secretsProviderSettings.getEmptyState()).toBeVisible();

			await pong.secretsProviderSettings.clickEmptyStateAddButton();
			await pong.secretsProviderConnectionModal.waitForModal();

			await pong.secretsProviderConnectionModal.fillConnectionName(providerName);
			await pong.secretsProviderConnectionModal.selectProviderType('AWS Secrets Manager');
			await pong.secretsProviderConnectionModal.fillProviderField(
				'region',
				INVALID_AWS_SETTINGS_REGION,
			);
			await pong.secretsProviderConnectionModal.fillProviderField(
				'accessKeyId',
				LOCALSTACK_AWS_SETTINGS.accessKeyId,
			);
			await pong.secretsProviderConnectionModal.fillProviderField(
				'secretAccessKey',
				LOCALSTACK_AWS_SETTINGS.secretAccessKey,
			);

			await pong.secretsProviderConnectionModal.save();
			await expect(pong.secretsProviderConnectionModal.getErrorBanner()).toBeVisible();
			await expect(pong.secretsProviderConnectionModal.getSuccessCallout()).toBeHidden();

			await pong.secretsProviderConnectionModal.fillProviderField(
				'region',
				LOCALSTACK_AWS_SETTINGS.region,
			);

			await pong.secretsProviderConnectionModal.save();
			await expect(pong.secretsProviderConnectionModal.getSuccessCallout()).toBeVisible();

			await pong.secretsProviderConnectionModal.switchToScopeTab();
			await pong.secretsProviderConnectionModal.selectScope('SecretProject');
			await pong.secretsProviderConnectionModal.save();
			await pong.secretsProviderConnectionModal.close();

			await expect(pong.secretsProviderSettings.getProviderNameCard(providerName)).toBeVisible();
			await expect(
				pong.secretsProviderSettings.getProviderCardProjectBadge(providerName),
			).toBeVisible();

			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getExternalSecretsSection()).toBeVisible();
			await expect(pong.projectSettings.getExternalSecretsTable()).toBeVisible();
			await expect(pong.projectSettings.getExternalSecretsTableRow(providerName)).toBeVisible();

			const credentialName = 'Project Secret Ref Header Auth';
			await pong.navigate.toCredentials(projectId);
			await pong.credentials.emptyListCreateCredentialButton.click();
			await pong.credentials.selectCredentialType('Header Auth');
			await pong.credentials.credentialModal.waitForModal();
			await pong.credentials.credentialModal.renameCredential(credentialName);
			// plain text, not expression mode
			await pong.credentials.credentialModal.fillField('name', 'Authorization');
			// expression mode, referencing the project-scoped secret
			await pong.credentials.credentialModal.fillExpressionField(
				'value',
				`{{ $secrets['${providerName}']['projectsecret'] }}`,
			);
			await expect(pong.credentials.credentialModal.getParameterInputHint()).toContainText(
				'*********',
			);
			await pong.credentials.credentialModal.save();
			await pong.credentials.credentialModal.close();

			await expect(pong.credentials.cards.getCredential(credentialName)).toBeVisible();
		});
	},
);
