import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Credentials',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('composer: createFromList creates credential', async ({ pong }) => {
			const projectId = await pong.start.fromNewProject();
			const credentialName = `credential-${nanoid()}`;
			await pong.navigate.toCredentials(projectId);

			await pong.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: '1234567890' },
				{
					name: credentialName,
					closeDialog: false,
				},
			);
			await expect(pong.credentials.cards.getCredential(credentialName)).toBeVisible();
		});

		test('composer: createFromNdv creates credential for node', async ({ pong }) => {
			const name = `credential-${nanoid()}`;
			await pong.start.fromNewProjectBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion', { action: 'Append a block' });

			await pong.credentialsComposer.createFromNdv({ apiKey: '1234567890' }, { name });
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(name);
		});

		test('composer: createFromApi creates credential (then NDV picks it up)', async ({ pong }) => {
			const name = `credential-${nanoid()}`;
			const projectId = await pong.start.fromNewProjectBlankCanvas();
			await pong.credentialsComposer.createFromApi({
				name,
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId,
			});

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion', { action: 'Append a block' });
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(name);
		});

		test('create a new credential from empty state using the credential chooser list', async ({
			pong,
		}) => {
			const projectId = await pong.start.fromNewProject();
			await pong.navigate.toCredentials(projectId);
			await pong.credentials.emptyListCreateCredentialButton.click();
			await pong.credentials.createCredentialFromCredentialPicker('Notion API', {
				apiKey: '1234567890',
			});
			await expect(pong.credentials.cards.getCredentials()).toHaveCount(1);
		});

		test('create a new credential from the NDV', async ({ pong }) => {
			const uniqueCredentialName = `credential-${nanoid()}`;
			await pong.start.fromNewProjectBlankCanvas();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion', { action: 'Append a block' });

			await pong.ndv.clickCreateNewCredential();
			await pong.canvas.credentialModal.addCredential(
				{
					apiKey: '1234567890',
				},
				{ name: uniqueCredentialName },
			);
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(uniqueCredentialName);
		});

		test('add an existing credential from the NDV', async ({ pong }) => {
			const uniqueCredentialName = `credential-${nanoid()}`;
			const projectId = await pong.start.fromNewProjectBlankCanvas();

			await pong.api.credentials.createCredential({
				name: uniqueCredentialName,
				type: 'notionApi',
				data: {
					apiKey: '1234567890',
				},
				projectId,
			});

			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion', { action: 'Append a block' });
			await expect(pong.ndv.getCredentialSelect()).toHaveValue(uniqueCredentialName);
		});
	},
);
