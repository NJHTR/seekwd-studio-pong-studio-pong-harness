import { test, expect } from '../../../fixtures/base';

test.use({ capability: 'email' });

test(
	'EmailSend node sends via SMTP @engine:v2',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	async ({ api, pong, services }) => {
		// Sign in to use internal APIs for creating credentials and workflows
		const mailpit = services.mailpit;

		// Create SMTP credential targeting Mailpit (uses internal hostname in container mode, localhost in local mode)
		const smtpCredential = await api.credentials.createCredential({
			name: 'SMTP (Test)',
			type: 'smtp',
			data: {
				user: '',
				password: '',
				host: mailpit.smtpHost,
				port: mailpit.smtpPort,
				secure: false,
				disableStartTls: true,
			},
		});

		// Define a workflow with Manual Trigger -> EmailSend
		const toEmail = 'test@recipient.local';
		const subject = 'Playwright Mailpit SMTP';
		const workflowDefinition = {
			name: 'Mailpit EmailSend Workflow',
			nodes: [
				{
					id: '1',
					name: 'Manual Trigger',
					type: 'pong-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
				},
				{
					id: '2',
					name: 'Email',
					type: 'pong-nodes-base.emailSend',
					typeVersion: 2,
					position: [300, 0],
					parameters: {
						fromEmail: 'test@pong.local',
						toEmail,
						subject,
						emailFormat: 'text',
						text: 'Hello from pong E2E test',
					},
					credentials: {
						smtp: {
							id: smtpCredential.id,
							name: smtpCredential.name,
						},
					},
				},
			],
			connections: {
				'Manual Trigger': {
					main: [[{ node: 'Email', type: 'main', index: 0 }]],
				},
			},
			active: false,
		} as const;

		const { workflowId } = await api.workflows.createWorkflowFromDefinition(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			workflowDefinition as any,
			{ makeUnique: true },
		);

		// Execute the workflow via UI API endpoint by navigating to the canvas and clicking run
		await pong.start.fromExistingWorkflow(workflowId);
		await pong.workflowComposer.executeWorkflowAndWaitForNotification(
			'Workflow executed successfully',
		);

		// The run starts from the canvas, so check the engine the execution reached.
		await api.workflows.assertLatestExecutionRoutedToEngine(workflowId);

		const msg = await mailpit.waitForMessage({ to: toEmail, subject });

		expect(msg).toBeTruthy();
	},
);
