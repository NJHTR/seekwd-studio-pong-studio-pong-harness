import flatted from 'flatted';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';

/**
 * Security tests for waiting endpoint signature validation.
 *
 * These tests verify that form-waiting and webhook-waiting endpoints
 * require valid HMAC signatures to prevent session interception attacks.
 *
 * Note: Send and Wait approval flow tests are in nodes/send-and-wait.spec.ts
 */
test.describe(
	'Waiting Endpoint Security',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test.describe('webhook-waiting signature validation', () => {
			test('should reject unsigned and tampered requests, accept valid signature @engine:v2', async ({
				api,
			}) => {
				const { webhookPath, workflowId } = await api.workflows.importWorkflowFromFile(
					'wait-webhook-resume.json',
				);

				const triggerResponse = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
					method: 'POST',
				});
				expect(triggerResponse.ok()).toBe(true);

				const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');
				expect(execution).toBeDefined();
				await api.workflows.assertLatestExecutionRoutedToEngine(workflowId);

				const unsignedResponse = await api.webhooks.trigger(`/webhook-waiting/${execution.id}`, {
					maxNotFoundRetries: 0,
				});
				expect(unsignedResponse.status()).toBe(401);

				const tamperedResponse = await api.webhooks.trigger(
					`/webhook-waiting/${execution.id}?signature=tampered_invalid_signature_abc123`,
					{ maxNotFoundRetries: 0 },
				);
				expect(tamperedResponse.status()).toBe(401);

				const fullExecution = await api.workflows.getExecution(execution.id);
				expect(fullExecution.data).toBeDefined();

				const executionData = flatted.parse(fullExecution.data);
				const captureNodeOutput = executionData.resultData.runData['Capture Resume URL'];
				expect(captureNodeOutput).toBeDefined();

				const resumeUrl = captureNodeOutput[0].data.main[0][0].json.resumeUrl;
				expect(resumeUrl).toBeDefined();
				expect(resumeUrl).toContain('signature=');

				// Accept valid signature
				const urlObj = new URL(resumeUrl);
				const signedPath = `${urlObj.pathname}${urlObj.search}`;

				// The token binds no query here, so an extra parameter reaches the node decoded.
				const signedResponse = await api.webhooks.trigger(`${signedPath}&note=a%20b`, {
					maxNotFoundRetries: 0,
				});
				expect(signedResponse.ok()).toBe(true);

				const completedExecution = await api.workflows.waitForWorkflowStatus(
					workflowId,
					'success',
					10000,
				);
				expect(completedExecution.status).toBe('success');
				const { data } = await api.workflows.getExecution(completedExecution.id);
				const wait = flatted.parse(data).resultData.runData.Wait[0].data.main[0][0];
				expect(wait.json.query.note).toBe('a b');
			});
		});

		test.describe('form-waiting signature validation', () => {
			test('should reject unsigned and tampered requests, accept valid signature', async ({
				pong,
			}) => {
				await pong.start.fromBlankCanvas();

				await pong.canvas.clickNodeCreatorPlusButton();
				await pong.canvas.nodeCreatorItemByName('On form submission').click();
				await pong.ndv.fillParameterInput('Form Title', 'Security Test Form');
				await pong.ndv.fillParameterInput('Form Description', 'Testing signature validation');
				await pong.ndv.addFixedCollectionItem();
				await pong.ndv.fillParameterInputByName('fieldLabel', 'First field');
				await pong.ndv.clickBackToCanvasButton();

				await pong.canvas.addNode('pong Form', { closeNDV: false, action: 'Next Form Page' });
				await pong.ndv.addFixedCollectionItem();
				await pong.ndv.fillParameterInputByName('fieldLabel', 'Second field');
				await pong.ndv.clickBackToCanvasButton();

				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				await pong.canvas.openNode('On form submission');
				const formUrl = await pong.canvas.getTestFormUrl();

				const formPage = await PublicFormPage.fromNewTab(pong.page.context(), formUrl);
				await formPage.fillField('First field', 'test value');

				const responsePromise = formPage.waitForSubmission();
				await formPage.submit();

				const postResponse = await responsePromise;
				const responseBody = await postResponse.json();

				expect(responseBody.formWaitingUrl).toBeDefined();
				const waitingUrl: string = responseBody.formWaitingUrl;
				expect(waitingUrl).toContain('signature=');

				const urlObj = new URL(waitingUrl);
				const executionId = urlObj.pathname.split('/').pop()!;
				const validSignature = urlObj.searchParams.get('signature');

				await expect(async () => {
					const execution = await pong.api.workflows.getExecution(executionId);
					expect(execution.status).toBe('waiting');
				}).toPass();

				const unsignedResponse = await pong.api.webhooks.trigger(`/form-waiting/${executionId}`, {
					maxNotFoundRetries: 0,
				});
				expect(unsignedResponse.status()).toBe(401);

				const tamperedResponse = await pong.api.webhooks.trigger(
					`/form-waiting/${executionId}?signature=tampered_fake_signature_xyz789`,
					{ maxNotFoundRetries: 0 },
				);
				expect(tamperedResponse.status()).toBe(401);

				const signedResponse = await pong.api.webhooks.trigger(
					`/form-waiting/${executionId}?signature=${validSignature}`,
					{ maxNotFoundRetries: 0 },
				);
				expect(signedResponse.ok()).toBe(true);

				await formPage.close();
			});
		});
	},
);
