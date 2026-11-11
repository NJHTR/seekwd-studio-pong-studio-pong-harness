import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

const TEST_API_KEY = 'test-api-key';

test.describe(
	'Access Control Boundaries',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should prevent credential editing by sharee', async ({ pong, api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			const credentialName = `Owner Credential ${nanoid()}`;
			const credential = await api.credentials.createCredential({
				name: credentialName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const memberApi = await api.createApiForUser(member);
			const memberProject = await memberApi.projects.getMyPersonalProject();
			await api.credentials.shareCredential(credential.id, [memberProject.id]);

			const memberPong = await pong.start.withUser(member);
			await memberPong.navigate.toCredentials();
			await memberPong.credentials.cards.clickCredentialCard(credentialName);

			await expect(memberPong.credentials.credentialModal.getCredentialName()).toContainText(
				credentialName,
			);
			await expect(memberPong.credentials.credentialModal.getSaveButton()).toBeHidden();
		});

		test('should allow admin full access to credentials created by others', async ({
			pong,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});
			const admin = await api.publicApi.createUser({
				email: `admin-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Admin',
				role: 'global:admin',
			});

			const credentialName = `Member Credential ${nanoid()}`;
			const memberApi = await api.createApiForUser(member);
			await memberApi.credentials.createCredential({
				name: credentialName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const adminPong = await pong.start.withUser(admin);
			await adminPong.navigate.toCredentials();
			await adminPong.credentials.cards.clickCredentialCard(credentialName);

			await expect(adminPong.credentials.credentialModal.getCredentialName()).toContainText(
				credentialName,
			);

			const apiKeyInput = adminPong.credentials.credentialModal.getFieldInput('apiKey');
			await expect(apiKeyInput).toHaveValue(/__pong_BLANK_VALUE_/);

			await adminPong.credentials.credentialModal.changeTab('Sharing');
			await expect(adminPong.credentials.credentialModal.getUsersSelect()).toBeVisible();

			await adminPong.credentials.credentialModal.getUsersSelect().click();
			// Personal projects show "Name (Personal space)" instead of email
			const adminName = `${admin.firstName} ${admin.lastName}`;
			await expect(
				adminPong.credentials.credentialModal.getVisibleDropdownOption(adminName),
			).toBeVisible();
		});

		test('should prevent access to private workflows via direct URL', async ({ api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});
			const workflow = await api.workflows.createWorkflow({
				name: `Private Workflow ${nanoid()}`,
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
			const response = await memberApi.workflows.getWorkflowRaw(workflow.id);
			expect(response.status()).toBe(403);
		});

		test('should enforce project isolation for team projects', async ({ pong, api }) => {
			await api.setMaxTeamProjectsQuota(-1);

			const personalCredName = `Personal Credential ${nanoid()}`;
			await api.credentials.createCredential({
				name: personalCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
			});

			const devProject = await api.projects.createProject(`Development ${nanoid()}`);
			const testProject = await api.projects.createProject(`Testing ${nanoid()}`);

			const devCredName = `Dev Credential ${nanoid()}`;
			await api.credentials.createCredential({
				name: devCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
				projectId: devProject.id,
			});

			const testCredName = `Test Credential ${nanoid()}`;
			await api.credentials.createCredential({
				name: testCredName,
				type: 'notionApi',
				data: { apiKey: TEST_API_KEY },
				projectId: testProject.id,
			});

			await pong.navigate.toProject(testProject.id);
			await pong.projectTabs.clickWorkflowsTab();
			await pong.workflows.clickNewWorkflowButtonFromProject();
			await pong.canvas.addNode('Manual Trigger');
			await pong.canvas.addNode('Notion');
			await pong.canvas.getFirstAction().click();

			await pong.ndv.getNodeCredentialsSelect().click();
			await expect(pong.ndv.credentials.getOptionByText(testCredName)).toBeVisible();
			// The user's own personal credential follows them into a team project they belong to
			await expect(pong.ndv.credentials.getOptionByText(personalCredName)).toBeVisible();
			await expect(pong.ndv.credentials.getOptionByText(devCredName)).toBeHidden();
		});

		test('should prevent sharing team project workflows', async ({ pong, api }) => {
			const teamProject = await api.projects.createProject(`Team Project ${nanoid()}`);
			const teamWorkflow = await api.workflows.createInProject(teamProject.id, {
				name: `Team Workflow ${nanoid()}`,
			});

			await pong.navigate.toWorkflow(teamWorkflow.id);
			await pong.canvas.openShareModal();
			await expect(pong.workflowSharingModal.container).toBeVisible();

			// Team project workflows cannot be shared - no user selector shown
			await expect(pong.workflowSharingModal.getUsersSelect()).toBeHidden();
		});
	},
);
