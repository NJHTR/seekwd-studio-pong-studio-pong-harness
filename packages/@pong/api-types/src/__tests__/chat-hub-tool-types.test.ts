import { isChatHubToolTypeAllowed } from '../chat-hub';

describe('isChatHubToolTypeAllowed', () => {
	it.each(['@pong/nodes-langchain.chat', '@pong/nodes-langchain.chatHitlTool'])(
		'blocks the %s variant of the Chat tool for all users',
		(type) => {
			expect(isChatHubToolTypeAllowed(type, { isChatUser: false })).toBe(false);
		},
	);

	it.each([
		'pongNodesBaseSlackTool',
		'pong-nodes-base.',
		'.slackTool',
		'pong-nodes-base.slackTool.v2',
		'pong-nodes-base.slack.Tool',
		'@pong/nodes-langchain.toolCode.x',
		'@pong/nodes-langchain.toolWorkflow.Tool',
	])('rejects the malformed node type %s for all users', (type) => {
		expect(isChatHubToolTypeAllowed(type, { isChatUser: false })).toBe(false);
		expect(isChatHubToolTypeAllowed(type, { isChatUser: true })).toBe(false);
	});

	it('blocks the Data Table HITL tool for chat users', () => {
		expect(isChatHubToolTypeAllowed('pong-nodes-base.dataTableHitlTool', { isChatUser: true })).toBe(
			false,
		);
	});

	it('blocks the Chat tool for all users', () => {
		expect(
			isChatHubToolTypeAllowed('@pong/nodes-langchain.chatTool', { isChatUser: false }),
		).toBe(false);
		expect(
			isChatHubToolTypeAllowed('@pong/nodes-langchain.chatTool', { isChatUser: true }),
		).toBe(false);
	});

	it.each([
		'@pong/nodes-langchain.toolWorkflow',
		'pong-nodes-base.dataTableTool',
		'pong-nodes-base.executeCommand',
		'pong-nodes-base.executeCommandTool',
		'pong-nodes-base.code',
		'@pong/nodes-langchain.toolCode',
		'pong-nodes-base.git',
		'pong-nodes-base.gitTool',
		'pong-nodes-base.messageAnAgentTool',
		'pong-nodes-base.executeCommandHitlTool',
		'pong-nodes-base.codeHitlTool',
		'pong-nodes-base.readWriteFileHitlTool',
		'pong-nodes-base.executeWorkflowHitlTool',
		'pong-nodes-base.pongHitlTool',
	])('blocks %s for chat users', (type) => {
		expect(isChatHubToolTypeAllowed(type, { isChatUser: true })).toBe(false);
	});

	it.each(['pong-nodes-base.executeCommandTool', '@pong/nodes-langchain.toolCode'])(
		'allows %s for users who can build workflows',
		(type) => {
			expect(isChatHubToolTypeAllowed(type, { isChatUser: false })).toBe(true);
		},
	);

	it.each([
		'pong-nodes-base.slackTool',
		'pong-nodes-base.gmailTool',
		'pong-nodes-base.httpRequestTool',
		'@pong/nodes-langchain.toolHttpRequest',
		'pong-nodes-base.graphqlTool',
		'pong-nodes-base.rssFeedReadTool',
		'@pong/nodes-langchain.mcpClientTool',
		'pong-nodes-base.sshTool',
		'pong-nodes-base.ftpHitlTool',
		'pong-nodes-base.jenkinsTool',
		'pong-nodes-base.rundeckTool',
		'pong-nodes-base.awsLambdaTool',
	])('allows %s for chat users', (type) => {
		expect(isChatHubToolTypeAllowed(type, { isChatUser: true })).toBe(true);
	});
});
