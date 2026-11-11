import { mockInstance } from '@pong/backend-test-utils';
import type { GlobalConfig } from '@pong/config';
import type { ApiKey, User, PersonRepository } from '@pong/db';
import { Person } from '@pong/db';
import { PROJECT_EDITOR_ROLE_SLUG, PROJECT_VIEWER_ROLE_SLUG } from '@pong/permissions';
import type { IWorkflowBase } from 'pong-workflow';
import { mock } from 'vitest-mock-extended';

import type { UrlService } from '@pong/backend-services';
import type { InviteEmailData, PasswordResetData } from '@/user-management/email/interfaces';
import { NodeMailer } from '@/user-management/email/node-mailer';
import { UserManagementMailer } from '@/user-management/email/user-management-mailer';
import { mockServiceAccount } from '@test/mock-objects';

// This suite renders real email templates from disk; opt out of the global fs mocks.
vi.unmock('node:fs/promises');
vi.unmock('fs/promises');

describe('UserManagementMailer', () => {
	const email = 'test@user.com';
	const nodeMailer = mockInstance(NodeMailer);
	const inviteEmailData = mock<InviteEmailData>({
		email,
		inviteAcceptUrl: 'https://accept.url',
	});
	const passwordResetData = mock<PasswordResetData>({
		email,
		passwordResetUrl: 'https://reset.url',
	});

	beforeEach(() => {
		vi.clearAllMocks();
		nodeMailer.sendMail.mockResolvedValue({ emailSent: true });
	});

	describe('when SMTP is not configured', () => {
		const config = mock<GlobalConfig>({
			userManagement: {
				emails: {
					mode: '',
				},
			},
		});
		const userManagementMailer = new UserManagementMailer(config, mock(), mock(), mock(), mock());

		it('should not setup email transport', async () => {
			expect(userManagementMailer.isEmailSetUp).toBe(false);
			expect(userManagementMailer.mailer).toBeUndefined();
		});

		it('should not send emails', async () => {
			const result = await userManagementMailer.invite(inviteEmailData);
			expect(result.emailSent).toBe(false);
			expect(nodeMailer.sendMail).not.toHaveBeenCalled();
		});
	});

	describe('when SMTP is configured', () => {
		const config = mock<GlobalConfig>({
			userManagement: {
				emails: {
					mode: 'smtp',
					smtp: {
						host: 'email.host',
					},
				},
			},
		});
		const urlService = mock<UrlService>();
		const personRepository = mock<PersonRepository>();
		const userManagementMailer = new UserManagementMailer(
			config,
			mock(),
			personRepository,
			urlService,
			mock(),
		);

		beforeEach(() => {
			urlService.getInstanceBaseUrl.mockReturnValue('https://pong.url');
		});

		it('should setup email transport', async () => {
			expect(userManagementMailer.isEmailSetUp).toBe(true);
			expect(userManagementMailer.mailer).toEqual(nodeMailer);
		});

		it('should send invitation emails', async () => {
			const result = await userManagementMailer.invite(inviteEmailData);
			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				body: expect.stringContaining(`href="${inviteEmailData.inviteAcceptUrl}"`),
				emailRecipients: email,
				subject: 'You have been invited to pong',
			});
		});

		it('should send password reset emails', async () => {
			const result = await userManagementMailer.passwordReset(passwordResetData);
			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				body: expect.stringContaining(`href="${passwordResetData.passwordResetUrl}"`),
				emailRecipients: email,
				subject: 'pong password reset',
			});
		});

		it('should send workflow share notifications', async () => {
			const sharer = Object.assign(new Person(), { firstName: 'Sharer', email: 'sharer@user.com' });
			const newShareeIds = ['recipient1', 'recipient2'];
			const workflow = mock<IWorkflowBase>({ id: 'workflow1', name: 'Test Workflow' });
			personRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
				{ id: 'recipient2', email: 'recipient2@user.com' },
			]);
			const result = await userManagementMailer.notifyWorkflowShared({
				sharer,
				newShareeIds,
				workflow,
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledTimes(2);
			newShareeIds.forEach((id, index) => {
				expect(nodeMailer.sendMail).toHaveBeenNthCalledWith(index + 1, {
					body: expect.stringContaining(`href="https://pong.url/workflow/${workflow.id}"`),
					emailRecipients: `${id}@user.com`,
					subject: 'Sharer has shared an pong workflow with you',
				});

				const callBody = nodeMailer.sendMail.mock.calls[index][0].body;
				expect(callBody).toContain('Test Workflow');
				expect(callBody).toContain('A workflow has been shared with you');
			});
		});

		it.each([
			[
				'a workflow',
				async (sharer: User) =>
					await userManagementMailer.notifyWorkflowShared({
						sharer,
						newShareeIds: ['recipient1'],
						workflow: mock<IWorkflowBase>({ id: 'workflow1', name: 'Test Workflow' }),
					}),
				'Deploy bot has shared an pong workflow with you',
			],
			[
				'a credential',
				async (sharer: User) =>
					await userManagementMailer.notifyCredentialsShared({
						sharer,
						newShareeIds: ['recipient1'],
						credentialsName: 'Test Credentials',
					}),
				'Deploy bot has shared an pong credential with you',
			],
			[
				'a project',
				async (sharer: User) =>
					await userManagementMailer.notifyProjectShared({
						sharer,
						newSharees: [{ userId: 'recipient1', role: PROJECT_EDITOR_ROLE_SLUG }],
						project: { id: 'project1', name: 'Test Project' },
					}),
				'Deploy bot has invited you to a project',
			],
		])('should name a service account that shares %s by its name', async (_, share, subject) => {
			personRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
			]);

			await share(mockServiceAccount());

			expect(nodeMailer.sendMail).toHaveBeenCalledWith(expect.objectContaining({ subject }));
		});

		it('should send credentials share notifications', async () => {
			const sharer = Object.assign(new Person(), { firstName: 'Sharer', email: 'sharer@user.com' });
			const newShareeIds = ['recipient1', 'recipient2'];
			personRepository.getEmailsByIds.mockResolvedValue([
				{ id: 'recipient1', email: 'recipient1@user.com' },
				{ id: 'recipient2', email: 'recipient2@user.com' },
			]);
			const result = await userManagementMailer.notifyCredentialsShared({
				sharer,
				newShareeIds,
				credentialsName: 'Test Credentials',
			});
			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledTimes(2);
			newShareeIds.forEach((id, index) => {
				expect(nodeMailer.sendMail).toHaveBeenNthCalledWith(index + 1, {
					body: expect.stringContaining('href="https://pong.url/home/credentials"'),
					emailRecipients: `${id}@user.com`,
					subject: 'Sharer has shared an pong credential with you',
				});

				const callBody = nodeMailer.sendMail.mock.calls[index][0].body;
				expect(callBody).toContain('Test Credentials');
				expect(callBody).toContain('A credential has been shared with you');
			});
		});

		it.each([
			[
				'crashes' as const,
				'because its executions repeatedly crashed',
				'Please review its recent executions',
			],
			[
				'memory-pressure' as const,
				'because pong repeatedly stopped its executions to keep the instance from running out of memory',
				'Memory can also run high because of other work.',
			],
		])(
			'should name the reason %s in workflow deactivation emails',
			async (reason, text, nextStep) => {
				const recipient = mock<User>({ id: 'owner-1' });
				const workflow = mock<IWorkflowBase>({ id: 'workflow1', name: 'Test Workflow' });
				personRepository.getEmailsByIds.mockResolvedValue([
					{ id: 'owner-1', email: 'owner@user.com' },
				]);

				const result = await userManagementMailer.notifyWorkflowAutodeactivated({
					recipient,
					workflow,
					reason,
				});

				expect(result.emailSent).toBe(true);
				const body = nodeMailer.sendMail.mock.calls[0][0].body as string;
				expect(body.replace(/\s+/g, ' ')).toContain(text);
				expect(body.replace(/\s+/g, ' ')).toContain(nextStep);
				expect(body).toContain('href="https://pong.url/workflow/workflow1"');
			},
		);

		it('should send api key revoked notifications', async () => {
			const apiKey = mock<ApiKey>({
				id: 'key-1',
				label: 'Test 123',
				apiKey: 'pong_api_xxxxxxxaaa5',
				userId: 'owner-1',
				user: Object.assign(new Person(), {
					id: 'owner-1',
					email: 'owner@example.com',
					firstName: 'Maria',
					lastName: 'Silva',
				}),
			});
			const revoker = Object.assign(new Person(), {
				firstName: 'Jan',
				lastName: 'Ostrówka',
				email: 'jan@acme.test',
			});

			const result = await userManagementMailer.notifyApiKeyRevoked({ apiKey, revoker });

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				emailRecipients: 'owner@example.com',
				subject: 'Your pong API key was revoked',
				body: expect.stringContaining('href="https://pong.url/settings/api"'),
			});

			const callBody = nodeMailer.sendMail.mock.calls[0][0].body as string;
			expect(callBody).toContain('Test 123');
			expect(callBody).toContain('aaa5');
			expect(callBody).toContain('Jan Ostrówka');
			expect(callBody).toMatch(/\d{1,2} [A-Z][a-z]{2,3} \d{4}/);
		});

		it('falls back to the revoker email when no name is set', async () => {
			const apiKey = mock<ApiKey>({
				id: 'key-1',
				label: 'Test 123',
				apiKey: 'pong_api_xxxxxxxaaa5',
				userId: 'owner-1',
				user: Object.assign(new Person(), {
					id: 'owner-1',
					email: 'owner@example.com',
					firstName: 'Maria',
				}),
			});
			const revoker = Object.assign(new Person(), {
				firstName: undefined,
				lastName: undefined,
				email: 'jan@acme.test',
			});

			await userManagementMailer.notifyApiKeyRevoked({ apiKey, revoker });

			const callBody = nodeMailer.sendMail.mock.calls[0][0].body as string;
			expect(callBody).toContain('jan@acme.test');
		});

		it('does not send an api key revoked notification when the key owner is a service account', async () => {
			const apiKey = mock<ApiKey>({
				id: 'key-1',
				label: 'Test 123',
				apiKey: 'pong_api_xxxxxxxaaa5',
				userId: 'sa-1',
				user: mockServiceAccount({ id: 'sa-1' }),
			});
			const revoker = Object.assign(new Person(), {
				firstName: 'Jan',
				lastName: 'Ostrówka',
				email: 'jan@acme.test',
			});

			const result = await userManagementMailer.notifyApiKeyRevoked({ apiKey, revoker });

			expect(result).toEqual({ emailSent: false });
			expect(nodeMailer.sendMail).not.toHaveBeenCalled();
		});

		it('names a service account revoker by its name in the api key revoked notification', async () => {
			const apiKey = mock<ApiKey>({
				id: 'key-1',
				label: 'Test 123',
				apiKey: 'pong_api_xxxxxxxaaa5',
				userId: 'owner-1',
				user: Object.assign(new Person(), {
					id: 'owner-1',
					email: 'owner@example.com',
					firstName: 'Maria',
				}),
			});

			const result = await userManagementMailer.notifyApiKeyRevoked({
				apiKey,
				revoker: mockServiceAccount({ id: 'sa-1' }, 'Deploy bot'),
			});

			expect(result.emailSent).toBe(true);
			const callBody = nodeMailer.sendMail.mock.calls[0][0].body as string;
			expect(callBody).toContain('Deploy bot');
		});

		it('should send mcp client revoked notifications', async () => {
			const revoker = Object.assign(new Person(), {
				firstName: 'Jan',
				lastName: 'Ostrówka',
				email: 'jan@acme.test',
			});

			const result = await userManagementMailer.notifyMcpClientRevoked({
				clientName: 'Claude Code',
				owner: { email: 'owner@example.com', firstName: 'Maria' },
				revoker,
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				emailRecipients: 'owner@example.com',
				subject: 'Your pong MCP client access was revoked',
				body: expect.stringContaining('href="https://pong.url/settings/mcp"'),
			});

			const callBody = nodeMailer.sendMail.mock.calls[0][0].body as string;
			expect(callBody).toContain('Claude Code');
			expect(callBody).toContain('Jan Ostrówka');
			expect(callBody).toMatch(/\d{1,2} [A-Z][a-z]{2,3} \d{4}/);
		});

		it('should send project share notifications', async () => {
			const sharer = Object.assign(new Person(), { firstName: 'Sharer', email: 'sharer@user.com' });
			const newSharees = [
				{ userId: 'recipient1', role: PROJECT_EDITOR_ROLE_SLUG },
				{ userId: 'recipient2', role: PROJECT_VIEWER_ROLE_SLUG },
			];
			const project = { id: 'project1', name: 'Test Project' };
			personRepository.getEmailsByIds.mockResolvedValue([
				{
					id: 'recipient1',
					email: 'recipient1@user.com',
				},
				{
					id: 'recipient2',
					email: 'recipient2@user.com',
				},
			]);
			const result = await userManagementMailer.notifyProjectShared({
				sharer,
				newSharees,
				project,
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledTimes(2);
			newSharees.forEach((sharee, index) => {
				expect(nodeMailer.sendMail).toHaveBeenCalledWith({
					body: expect.stringContaining(`href="https://pong.url/projects/${project.id}"`),
					emailRecipients: `recipient${index + 1}@user.com`,
					subject: 'Sharer has invited you to a project',
				});

				const callBody = nodeMailer.sendMail.mock.calls[index][0].body;
				expect(callBody).toContain(
					`You have been added to the <b>${project.name}</b> project as ${sharee.role.replace('project:', '')}`,
				);
			});
		});

		it('should send a migration findings email with one link per workflow', async () => {
			const result = await userManagementMailer.migrationFindings({
				email,
				firstName: 'Grace',
				notifierName: 'Ada Lovelace',
				ruleTitle: 'Removed nodes',
				targetVersion: 'v3',
				workflows: [
					{ id: 'wf-1', name: 'Billing sync' },
					{ id: 'wf-2', name: 'Lead intake' },
				],
				reportUrl: 'https://pong.url/settings/migration-report/removed-nodes-v3',
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				body: expect.stringContaining(
					'href="https://pong.url/settings/migration-report/removed-nodes-v3"',
				),
				emailRecipients: email,
				subject: 'Your workflows need changes before the upgrade to pong v3',
			});
			const callBody = nodeMailer.sendMail.mock.calls[0][0].body;
			expect(callBody).toContain('Hi Grace,');
			expect(callBody).toContain('Ada Lovelace asked you');
			expect(callBody).toContain('Removed nodes');
			expect(callBody).toContain('<a href="https://pong.url/workflow/wf-1">Billing sync</a>');
			expect(callBody).toContain('<a href="https://pong.url/workflow/wf-2">Lead intake</a>');
		});

		it('should send an agent budget alert email', async () => {
			const result = await userManagementMailer.agentBudgetAlert({
				email,
				firstName: 'Ada',
				agentName: 'Support Agent',
				agentUrl: 'https://pong.url/projects/project-1/agents/agent-1',
				alertThresholdPercent: 80,
			});

			expect(result.emailSent).toBe(true);
			expect(nodeMailer.sendMail).toHaveBeenCalledWith({
				body: expect.stringContaining('href="https://pong.url/projects/project-1/agents/agent-1"'),
				emailRecipients: email,
				subject: 'Your agent reached its monthly budget alert',
			});
			const callBody = nodeMailer.sendMail.mock.calls[0][0].body;
			expect(callBody).toContain('Support Agent');
			expect(callBody).toContain('80%');
			expect(callBody).toContain('Hi Ada,');
		});
	});
});
