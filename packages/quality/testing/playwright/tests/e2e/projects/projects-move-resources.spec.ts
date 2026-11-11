import {
	INSTANCE_ADMIN_CREDENTIALS,
	INSTANCE_MEMBER_CREDENTIALS,
	INSTANCE_OWNER_CREDENTIALS,
} from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.use({ capability: { env: { TEST_ISOLATION: 'projects-move-resources' } } });

test.describe(
	'Projects - Moving Resources @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		test.beforeEach(async ({ pong }) => {
			// Enable features required for project workflows and moving resources
			await pong.api.enableFeature('sharing');
			await pong.api.enableFeature('folders');
			await pong.api.enableFeature('advancedPermissions');
			await pong.api.enableFeature('projectRole:admin');
			await pong.api.enableFeature('projectRole:editor');
			await pong.api.setMaxTeamProjectsQuota(-1);

			// Create workflow + credential in Home/Personal project
			await pong.api.workflows.createWorkflow({
				name: 'Workflow in Home project',
				nodes: [],
				connections: {},
				active: false,
			});
			await pong.api.credentials.createCredential({
				name: 'Credential in Home project',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
			});

			// Create Project 1 with resources
			const project1 = await pong.api.projects.createProject('Project 1');
			await pong.api.workflows.createInProject(project1.id, {
				name: 'Workflow in Project 1',
			});
			await pong.api.credentials.createCredential({
				name: 'Credential in Project 1',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project1.id,
			});

			// Create Project 2 with resources
			const project2 = await pong.api.projects.createProject('Project 2');
			await pong.api.workflows.createInProject(project2.id, {
				name: 'Workflow in Project 2',
			});
			await pong.api.credentials.createCredential({
				name: 'Credential in Project 2',
				type: 'notionApi',
				data: { apiKey: '1234567890' },
				projectId: project2.id,
			});

			// Navigate to home to load sidebar with new projects
			await pong.goHome();
			// The Overview lists the three workflows created above. Waiting for them
			// lets the view finish its first initialization, which ends with a
			// `router.replace` of the query string. A sidebar click that lands during
			// that replace is cancelled and the page stays on the Overview.
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(3);
		});

		test('should move the workflow to expected projects @auth:owner', async ({ pong }) => {
			// Move workflow from Personal to Project 2
			await pong.sideBar.clickPersonalMenuItem();
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);
			await pong.workflowComposer.moveToProject('Workflow in Home project', 'Project 2');

			// Verify Personal has 0 workflows
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(0);

			// Move workflow from Project 1 to Project 2
			await pong.sideBar.clickProjectMenuItem('Project 1');
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(1);
			await pong.workflowComposer.moveToProject('Workflow in Project 1', 'Project 2');

			// Move workflow from Project 2 to member user
			await pong.sideBar.clickProjectMenuItem('Project 2');
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(3);
			await pong.workflowComposer.moveToProject(
				'Workflow in Home project',
				INSTANCE_MEMBER_CREDENTIALS[0].email,
				null,
			);

			// Verify Project 2 has 2 workflows remaining
			await expect(pong.workflows.cards.getWorkflows()).toHaveCount(2);
		});

		test('should move the credential to expected projects @auth:owner', async ({ pong }) => {
			// Move credential from Project 1 to Project 2
			await pong.sideBar.clickProjectMenuItem('Project 1');
			await pong.sideBar.clickCredentialsLink();
			await expect(pong.credentials.cards.getCredentials()).toHaveCount(1);

			const credentialCard1 = pong.credentials.cards.getCredential('Credential in Project 1');
			await pong.credentials.cards.openCardActions(credentialCard1);
			await pong.credentials.cards.getCardAction('move').click();
			await expect(pong.resourceMoveModal.getMoveCredentialButton()).toBeDisabled();

			await pong.resourceMoveModal.openProjectSelect();
			await expect(pong.resourceMoveModal.getProjectOptions()).toHaveCount(6);
			await pong.resourceMoveModal.selectProjectOption('Project 2');
			await pong.resourceMoveModal.clickMoveCredentialButton();

			await expect(pong.credentials.cards.getCredentials()).toHaveCount(0);

			// Move credential from Project 2 to admin user
			await pong.sideBar.clickProjectMenuItem('Project 2');
			await pong.sideBar.clickCredentialsLink();
			await expect(pong.credentials.cards.getCredentials()).toHaveCount(2);

			const credentialCard2 = pong.credentials.cards.getCredential('Credential in Project 1');
			await pong.credentials.cards.openCardActions(credentialCard2);
			await pong.credentials.cards.getCardAction('move').click();
			await expect(pong.resourceMoveModal.getMoveCredentialButton()).toBeDisabled();

			await pong.resourceMoveModal.openProjectSelect();
			await expect(pong.resourceMoveModal.getProjectOptions()).toHaveCount(6);
			await pong.resourceMoveModal.selectProjectOption(INSTANCE_ADMIN_CREDENTIALS.email);
			await pong.resourceMoveModal.clickMoveCredentialButton();

			await expect(pong.credentials.cards.getCredentials()).toHaveCount(1);

			// Move credential from admin user (Home) back to owner user
			await pong.sideBar.clickHomeMenuItem();
			await pong.navigate.toCredentials();
			await expect(pong.credentials.cards.getCredentials()).toHaveCount(3);

			const credentialCard3 = pong.credentials.cards.getCredential('Credential in Project 1');
			await pong.credentials.cards.openCardActions(credentialCard3);
			await pong.credentials.cards.getCardAction('move').click();
			await expect(pong.resourceMoveModal.getMoveCredentialButton()).toBeDisabled();

			await pong.resourceMoveModal.openProjectSelect();
			await expect(pong.resourceMoveModal.getProjectOptions()).toHaveCount(6);
			await pong.resourceMoveModal.selectProjectOption(INSTANCE_OWNER_CREDENTIALS.email);
			await pong.resourceMoveModal.clickMoveCredentialButton();

			// Verify final state: 3 credentials total, 2 with Personal badge
			await expect(pong.credentials.cards.getCredentials()).toHaveCount(3);
			await expect(
				pong.credentials.cards.getCredentials().filter({ hasText: 'Personal' }),
			).toHaveCount(2);
		});
	},
);
