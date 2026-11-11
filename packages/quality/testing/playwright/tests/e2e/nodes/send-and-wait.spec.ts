import type { ProxyServer } from 'pong-containers/services/proxy';
import type { IWorkflowBase } from 'pong-workflow';

import { test as base, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';
import type { ApiHelpers } from '../../../services/api-helper';
import type { CredentialResponse } from '../../../services/credential-api-helper';

interface SlackBlock {
	type: string;
	elements?: Array<{ type: string; url?: string }>;
}

type SendAndWaitFixtures = {
	slackCredential: CredentialResponse;
	slackProxySetup: undefined;
};

const test = base.extend<SendAndWaitFixtures>({
	slackProxySetup: [
		async ({ services }, use) => {
			await services.proxy.clearAllExpectations();
			await services.proxy.createExpectation({
				httpRequest: { method: 'POST', path: '/api/chat.postMessage' },
				httpResponse: {
					statusCode: 200,
					headers: { 'Content-Type': ['application/json'] },
					body: JSON.stringify({
						ok: true,
						channel: 'C12345678',
						ts: '1234567890.123456',
						message: { text: 'Approval Request' },
					}),
				},
				times: { unlimited: true },
			});
			await use(undefined);
		},
		{ auto: true },
	],

	slackCredential: async ({ pong }, use) => {
		const credential = await pong.api.credentials.createCredential({
			name: `Slack Test ${crypto.randomUUID().slice(0, 8)}`,
			type: 'slackApi',
			data: { accessToken: 'xoxb-fake-token-for-testing' },
		});
		await use(credential);
		await pong.api.credentials.deleteCredential(credential.id);
	},
});

const NOT_A_BOT_USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0';

function getBlocksFromBody(body: { blocks?: SlackBlock[] } | undefined): SlackBlock[] | null {
	return body?.blocks ?? null;
}

function extractApprovalUrls(blocks: SlackBlock[]): { approveUrl?: string; rejectUrl?: string } {
	const buttons = blocks
		.filter((b) => b.type === 'actions' && b.elements)
		.flatMap((b) => b.elements?.filter((el) => el.type === 'button' && el.url) ?? []);

	return {
		approveUrl: buttons.find((btn) => btn.url?.includes('approved=true'))?.url,
		rejectUrl: buttons.find((btn) => btn.url?.includes('approved=false'))?.url,
	};
}

function extractFormUrl(blocks: SlackBlock[]): string | undefined {
	const buttons = blocks
		.filter((b) => b.type === 'actions' && b.elements)
		.flatMap((b) => b.elements?.filter((el) => el.type === 'button' && el.url) ?? []);

	// For custom forms, there's a single button with the form URL (contains signature)
	return buttons.find((btn) => btn.url?.includes('signature='))?.url;
}

async function waitForSlackRequest(proxyServer: ProxyServer) {
	await expect(async () => {
		const requests = await proxyServer.getAllRequestsMade();
		const slackRequest = requests.find(
			(r) => r.httpRequest?.path === '/api/chat.postMessage' && r.httpRequest?.method === 'POST',
		);
		expect(slackRequest).toBeDefined();
	}).toPass();
}

async function getApprovalUrlsFromSlack(proxyServer: ProxyServer) {
	const requests = await proxyServer.getAllRequestsMade();
	const slackRequest = requests.find(
		(r) => r.httpRequest?.path === '/api/chat.postMessage' && r.httpRequest?.method === 'POST',
	);
	const blocks = getBlocksFromBody(slackRequest?.httpRequest?.body as { blocks?: SlackBlock[] });
	return extractApprovalUrls(blocks!);
}

async function getFormUrlFromSlack(proxyServer: ProxyServer) {
	const requests = await proxyServer.getAllRequestsMade();
	const slackRequest = requests.find(
		(r) => r.httpRequest?.path === '/api/chat.postMessage' && r.httpRequest?.method === 'POST',
	);
	const blocks = getBlocksFromBody(slackRequest?.httpRequest?.body as { blocks?: SlackBlock[] });
	return extractFormUrl(blocks!);
}

async function clickApprovalLink(api: ApiHelpers, url: string) {
	console.log('Clicking approval URL:', url);
	const response = await api.webhooks.trigger(url, {
		headers: { 'User-Agent': NOT_A_BOT_USER_AGENT },
	});
	console.log('Response status:', response.status());
	const body = await response.text();
	console.log('Response body preview:', body.substring(0, 500));
	expect(response.ok()).toBe(true);
}

function withSlackCredential(credential: CredentialResponse) {
	return (workflow: Partial<IWorkflowBase>) => {
		workflow.nodes?.forEach((node) => {
			if (node.type === 'pong-nodes-base.slack') {
				node.credentials = { slackApi: { id: credential.id, name: credential.name } };
			}
		});
		return workflow;
	};
}

test.use({ capability: 'proxy' });

test.describe(
	'Send and Wait workflow interactions',
	{ annotation: [{ type: 'owner', description: 'NODES' }] },
	() => {
		test('should complete approval flow when clicking approve URL', async ({
			pong,
			services,
			slackCredential,
		}) => {
			const { workflowId } = await pong.api.workflows.importWorkflowFromFile(
				'send-and-wait-approval.json',
				{ transform: withSlackCredential(slackCredential) },
			);
			await pong.navigate.toWorkflow(workflowId);

			await pong.canvas.clickExecuteWorkflowButton('Manual Trigger');
			await waitForSlackRequest(services.proxy);
			await pong.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

			const { approveUrl } = await getApprovalUrlsFromSlack(services.proxy);
			expect(approveUrl).toContain('signature=');

			await clickApprovalLink(pong.api, approveUrl!);

			await expect(pong.canvas.getNodeSuccessStatusIndicator('Capture Result')).toBeVisible();
		});

		test('should complete rejection flow when clicking reject URL', async ({
			pong,
			services,
			slackCredential,
		}) => {
			const { workflowId } = await pong.api.workflows.importWorkflowFromFile(
				'send-and-wait-approval.json',
				{ transform: withSlackCredential(slackCredential) },
			);
			await pong.navigate.toWorkflow(workflowId);

			await pong.canvas.clickExecuteWorkflowButton('Manual Trigger');
			await waitForSlackRequest(services.proxy);
			await pong.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

			const { rejectUrl } = await getApprovalUrlsFromSlack(services.proxy);
			expect(rejectUrl).toContain('signature=');

			await clickApprovalLink(pong.api, rejectUrl!);

			await expect(pong.canvas.getNodeSuccessStatusIndicator('Capture Result')).toBeVisible();
		});

		test('should reject requests with invalid signatures', async ({
			pong,
			services,
			slackCredential,
		}) => {
			const { workflowId } = await pong.api.workflows.importWorkflowFromFile(
				'send-and-wait-approval.json',
				{ transform: withSlackCredential(slackCredential) },
			);
			await pong.navigate.toWorkflow(workflowId);

			await pong.canvas.clickExecuteWorkflowButton('Manual Trigger');
			await waitForSlackRequest(services.proxy);

			const execution = await pong.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

			const unsignedResponse = await pong.api.webhooks.trigger(
				`/webhook-waiting/${execution.id}/slack-send-wait`,
			);
			expect(unsignedResponse.status()).toBe(401);

			const tamperedResponse = await pong.api.webhooks.trigger(
				`/webhook-waiting/${execution.id}/slack-send-wait?approved=true&signature=tampered`,
			);
			expect(tamperedResponse.status()).toBe(401);
		});

		test('should complete form submission flow', async ({ pong, services, slackCredential }) => {
			const { workflowId } = await pong.api.workflows.importWorkflowFromFile(
				'send-and-wait-form.json',
				{ transform: withSlackCredential(slackCredential) },
			);
			await pong.navigate.toWorkflow(workflowId);

			await pong.canvas.clickExecuteWorkflowButton();
			await waitForSlackRequest(services.proxy);
			await pong.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

			const formUrl = await getFormUrlFromSlack(services.proxy);
			expect(formUrl).toContain('signature=');

			const formPage = await PublicFormPage.fromNewTab(pong.page.context(), formUrl!);

			await formPage.expectText('Test Form', { timeout: 10000 });
			await formPage.expectText('Please provide your information');

			await formPage.fillField('Name', 'John Doe');
			await formPage.fillField('Email', 'john@example.com');
			await formPage.fillField('Comments', 'This is a test comment');

			await formPage.submit('Submit Form');

			await formPage.expectText('Got it, thanks', { timeout: 10000 });

			await formPage.close();

			await expect(pong.canvas.getNodeSuccessStatusIndicator('Capture Result')).toBeVisible();

			await pong.canvas.openNode('Capture Result');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('John Doe');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 1)).toHaveText('john@example.com');
			await expect(pong.ndv.outputPanel.getTbodyCell(0, 2)).toHaveText('This is a test comment');
		});

		test('should complete approval flow in production mode (activated workflow)', async ({
			pong,
			services,
			slackCredential,
		}) => {
			const { workflowId, webhookPath } = await pong.api.workflows.importWorkflowFromFile(
				'send-and-wait-approval.json',
				{ transform: withSlackCredential(slackCredential) },
			);

			await pong.navigate.toWorkflow(workflowId);
			await pong.canvas.publishWorkflow();

			const triggerResponse = await pong.api.webhooks.trigger(`/webhook/${webhookPath}`);
			expect(triggerResponse.ok()).toBe(true);

			await waitForSlackRequest(services.proxy);
			await pong.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

			const { approveUrl } = await getApprovalUrlsFromSlack(services.proxy);
			expect(approveUrl).toContain('signature=');

			await clickApprovalLink(pong.api, approveUrl!);

			const execution = await pong.api.workflows.waitForWorkflowStatus(workflowId, 'success', 10000);
			expect(execution.status).toBe('success');
		});
	},
);
