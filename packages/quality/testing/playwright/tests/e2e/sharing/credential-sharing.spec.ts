import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe(
	'Credential Sharing',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should share credential with another user via UI', async ({ pong, api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			await pong.navigate.toCredentials();
			await pong.credentials.addResource.credential();
			await pong.credentials.selectCredentialType('Notion API');
			await pong.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
			const credentialName = `Test Credential ${nanoid()}`;
			await pong.credentials.credentialModal.renameCredential(credentialName);
			await pong.credentials.credentialModal.save();

			await pong.credentials.credentialModal.changeTab('Sharing');
			await pong.credentials.credentialModal.addUserToSharing(member.email);
			await pong.credentials.credentialModal.saveSharing();
			await pong.credentials.credentialModal.close();

			const memberPong = await pong.start.withUser(member);
			await memberPong.navigate.toCredentials();
			await expect(memberPong.credentials.cards.getCredential(credentialName)).toBeVisible();
		});

		test('should share credential with another user via API', async ({ api }) => {
			await api.enableProjectFeatures();

			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const credential = await api.credentials.createCredential({
				name: `Test Credential ${nanoid()}`,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const memberApi = await api.createApiForUser(member);
			const memberProject = await memberApi.projects.getMyPersonalProject();
			await api.credentials.shareCredential(credential.id, [memberProject.id]);

			const memberCredentials = await memberApi.credentials.getCredentials();
			const sharedCredential = memberCredentials.find((c) => c.id === credential.id);
			expect(sharedCredential).toBeTruthy();
			expect(sharedCredential?.name).toBe(credential.name);
		});

		test('should show shared credential with proper permissions in node credential dropdown', async ({
			pong,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const credential = await api.credentials.createCredential({
				name: `Test Credential ${nanoid()}`,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const memberApi = await api.createApiForUser(member);
			const memberProject = await memberApi.projects.getMyPersonalProject();
			await api.credentials.shareCredential(credential.id, [memberProject.id]);

			const memberPong = await pong.start.withUser(member);
			await memberPong.navigate.toWorkflow('new');
			await memberPong.canvas.addNode('Notion');
			await memberPong.canvas.getFirstAction().click();

			await expect(memberPong.ndv.getCredentialSelect()).toHaveValue(credential.name);
		});
	},
);
