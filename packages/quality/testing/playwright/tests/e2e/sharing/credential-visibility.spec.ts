import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe(
	'Credential Visibility Rules',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should show personal and shared credentials for members', async ({ pong, api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const ownerCredName = `Owner Credential ${nanoid()}`;
			await pong.navigate.toCredentials();
			await pong.credentials.addResource.credential();
			await pong.credentials.selectCredentialType('Notion API');
			await pong.credentials.credentialModal.fillField('apiKey', TEST_API_KEY);
			await pong.credentials.credentialModal.renameCredential(ownerCredName);
			await pong.credentials.credentialModal.save();

			await pong.credentials.credentialModal.changeTab('Sharing');
			await pong.credentials.credentialModal.addUserToSharing(member.email);
			await pong.credentials.credentialModal.saveSharing();
			await pong.credentials.credentialModal.close();

			const memberPong = await pong.start.withUser(member);
			await memberPong.navigate.toCredentials();
			const memberCredName = `Member Credential ${nanoid()}`;
			await memberPong.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: TEST_API_KEY },
				{
					name: memberCredName,
				},
			);

			await memberPong.navigate.toWorkflow('new');
			await memberPong.canvas.addNode('Manual Trigger');
			await memberPong.canvas.addNode('Notion');
			await memberPong.canvas.getFirstAction().click();

			// Both own credential and shared credential should be visible
			await memberPong.ndv.getNodeCredentialsSelect().click();
			await expect(memberPong.ndv.credentials.getOptionByText(ownerCredName)).toBeVisible();
			await expect(memberPong.ndv.credentials.getOptionByText(memberCredName)).toBeVisible();
		});

		test('should only show own credentials in shared workflow for members', async ({
			pong,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const ownerCredName = `Owner Credential ${nanoid()}`;
			await pong.navigate.toCredentials();
			await pong.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: TEST_API_KEY },
				{ name: ownerCredName },
			);

			const workflow = await api.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [
					{
						id: 'manual-trigger',
						name: 'Manual Trigger',
						type: 'pong-nodes-base.manualTrigger',
						position: [100, 200],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
			});

			const memberApi = await api.createApiForUser(member);
			const memberProject = await memberApi.projects.getMyPersonalProject();
			await api.workflows.shareWorkflow(workflow.id, [memberProject.id]);

			const memberPong = await pong.start.withUser(member);
			await memberPong.navigate.toCredentials();
			const memberCredName = `Member Credential ${nanoid()}`;
			await memberPong.credentialsComposer.createFromList(
				'Notion API',
				{ apiKey: TEST_API_KEY },
				{
					name: memberCredName,
				},
			);

			await memberPong.navigate.toWorkflow(workflow.id);
			await expect(memberPong.canvas.getCanvasNodes().first()).toBeVisible();

			await memberPong.canvas.addNode('Notion');
			await memberPong.canvas.getFirstAction().click();

			// Member should see their own credential but NOT the owner's unshared credential
			await memberPong.ndv.getNodeCredentialsSelect().click();
			await expect(memberPong.ndv.credentials.getOptionByText(memberCredName)).toBeVisible();
			await expect(memberPong.ndv.credentials.getOptionByText(ownerCredName)).toBeHidden();
		});

		test('should show owner and workflow creator credentials for global owner in shared workflows', async ({
			pong,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const memberApi = await api.createApiForUser(member);
			const memberCredName = `Member Credential ${nanoid()}`;
			await memberApi.credentials.createCredential({
				name: memberCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const workflow = await memberApi.workflows.createWorkflow({
				name: `Test Workflow ${nanoid()}`,
				nodes: [
					{
						id: 'manual-trigger',
						name: 'Manual Trigger',
						type: 'pong-nodes-base.manualTrigger',
						position: [100, 200],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
			});

			const ownerProject = await api.projects.getMyPersonalProject();
			await memberApi.workflows.shareWorkflow(workflow.id, [ownerProject.id]);

			const ownerCredName = `Owner Credential ${nanoid()}`;
			await api.credentials.createCredential({
				name: ownerCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			await pong.navigate.toWorkflow(workflow.id);
			await expect(pong.canvas.getCanvasNodes().first()).toBeVisible();

			await pong.canvas.addNode('Notion');
			await pong.canvas.getFirstAction().click();

			// Global owner should see both their own credential and the workflow creator's credential
			await pong.ndv.getNodeCredentialsSelect().click();
			const credentialOptions = pong.ndv.credentials.getDropdownOptions();
			await expect(credentialOptions.filter({ hasText: ownerCredName })).toBeVisible();
			await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
		});

		test('should show all personal credentials for global owner in own workflows', async ({
			pong,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const memberApi = await api.createApiForUser(member);
			const memberCredName = `Member Credential ${nanoid()}`;
			await memberApi.credentials.createCredential({
				name: memberCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			await pong.navigate.toWorkflow('new');
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion');
			await pong.canvas.getFirstAction().click();

			// Owner should see member's credential (global owner privilege)
			await pong.ndv.getNodeCredentialsSelect().click();
			const credentialOptions = pong.ndv.credentials.getDropdownOptions();
			await expect(credentialOptions.filter({ hasText: memberCredName })).toBeVisible();
		});
	},
);
