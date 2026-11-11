import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Workflow Sharing',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should share workflow with another user via UI', async ({ pong, api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

			// Create the workflow through the API. On an unsaved workflow the share
			// modal saves the workflow itself and races the canvas autosave for the
			// same POST /workflows; the loser gets a 400 and the modal stays open on a
			// "save changes?" prompt. This test proves the sharing, not the first save.
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

			await pong.start.fromExistingWorkflow(workflow.id);
			await pong.canvas.openShareModal();
			await expect(pong.workflowSharingModal.container).toBeVisible();
			await pong.workflowSharingModal.addUser(member.email);
			await pong.workflowSharingModal.save();

			const memberPong = await pong.start.withUser(member);
			await memberPong.navigate.toWorkflows();
			await expect(memberPong.workflows.cards.getWorkflow(workflow.name)).toBeVisible();
		});

		test('should share workflow with another user via API', async ({ api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

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

			const memberWorkflows = await memberApi.workflows.getWorkflows();
			const sharedWorkflow = memberWorkflows.find((w: { id: string }) => w.id === workflow.id);
			expect(sharedWorkflow).toBeTruthy();
			expect(sharedWorkflow?.name).toBe(workflow.name);
		});

		test('should allow shared user to edit shared workflow', async ({ pong, api }) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`,
				firstName: 'Test',
				lastName: 'Member',
			});

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
			await memberPong.navigate.toWorkflow(workflow.id);
			await expect(memberPong.canvas.getCanvasNodes()).toHaveCount(1);

			await memberPong.canvas.addNode('Code', { action: 'Code in JavaScript', closeNDV: true });
			await expect(memberPong.canvas.getCanvasNodes()).toHaveCount(2);
		});

		test('should prevent access to workflow when user is not shared', async ({ api }) => {
			await api.enableProjectFeatures();

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
			// With project features enabled, unauthorized access returns 403 (Forbidden)
			expect(response.status()).toBe(403);
		});
	},
);
