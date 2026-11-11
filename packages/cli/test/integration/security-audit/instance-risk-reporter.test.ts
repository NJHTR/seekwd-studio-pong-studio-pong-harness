import { createActiveWorkflow, testDb } from '@pong/backend-test-utils';
import { GlobalConfig } from '@pong/config';
import { WorkflowRepository } from '@pong/db';
import { Container } from '@pong/di';
import { NodeConnectionTypes } from 'pong-workflow';
import nock from 'nock';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import * as constants from '@/constants';
import { INSTANCE_REPORT, WEBHOOK_VALIDATOR_NODE_TYPES } from '@/security-audit/constants';
import { SecurityAuditService } from '@/security-audit/security-audit.service';
import { toReportTitle } from '@/security-audit/utils';

import {
	getRiskSection,
	saveManualTriggerWorkflow,
	MOCK_09990_PONG_VERSION,
	simulateOutdatedInstanceOnce,
	simulateUpToDateInstance,
} from './utils';

let securityAuditService: SecurityAuditService;
let originalPongVersion: string;

beforeAll(async () => {
	await testDb.init();

	securityAuditService = new SecurityAuditService(Container.get(WorkflowRepository), mock());

	originalPongVersion = constants.PONG_VERSION;
});

// Reset nock + the mutated PONG_VERSION constant between tests so each test
// starts from the up-to-date baseline. `simulateOutdatedInstanceOnce` mutates
// `constants.PONG_VERSION` and registers a `.once()` interceptor; without this
// reset, later tests inherit the stale version + a consumed interceptor and
// fail on requests to api.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness for the leftover version. Previously masked
// by the `workerIdleMemoryLimit: '1MB'` per-file worker recycling.
beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory', 'WorkflowPublishHistory']);
	nock.cleanAll();
	// The ESM export is read-only under Vitest, so spy the getter instead of assigning.
	vi.spyOn(constants, 'PONG_VERSION', 'get').mockReturnValue(originalPongVersion);
	simulateUpToDateInstance();
});

afterAll(async () => {
	nock.cleanAll();
	// The ESM export is read-only under Vitest, so spy the getter instead of assigning.
	vi.spyOn(constants, 'PONG_VERSION', 'get').mockReturnValue(originalPongVersion);
	await testDb.terminate();
});

test('should report webhook lacking authentication', async () => {
	const targetNodeId = uuid();

	await createActiveWorkflow({
		name: 'My Test Workflow',
		connections: {},
		nodes: [
			{
				parameters: {
					path: uuid(),
					options: {},
				},
				id: targetNodeId,
				name: 'Webhook',
				type: 'pong-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				webhookId: uuid(),
			},
		],
	});

	const testAudit = await securityAuditService.run(['instance']);

	const section = getRiskSection(
		testAudit,
		INSTANCE_REPORT.RISK,
		INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS,
	);

	if (!section.location) {
		expect.fail('Expected section to have locations');
	}

	expect(section.location).toHaveLength(1);

	expect(section.location[0].nodeId).toBe(targetNodeId);
});

test('should not report webhooks having basic or header auth', async () => {
	const promises = ['basicAuth', 'headerAuth'].map(async (authType) => {
		return await createActiveWorkflow({
			name: 'My Test Workflow',
			connections: {},
			nodes: [
				{
					parameters: {
						path: uuid(),
						authentication: authType,
						options: {},
					},
					id: uuid(),
					name: 'Webhook',
					type: 'pong-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					webhookId: uuid(),
				},
			],
		});
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['instance']);

	if (Array.isArray(testAudit)) expect.fail('Audit is empty');

	const report = testAudit[toReportTitle('instance')];

	if (!report) {
		expect.fail('Expected test audit to have instance risk report');
	}

	for (const section of report.sections) {
		expect(section.title).not.toBe(INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS);
	}
});

test('should not report webhooks validated by direct children', async () => {
	const promises = [...WEBHOOK_VALIDATOR_NODE_TYPES].map(async (nodeType) => {
		return await createActiveWorkflow({
			name: 'My Test Workflow',
			nodes: [
				{
					parameters: {
						path: uuid(),
						options: {},
					},
					id: uuid(),
					name: 'Webhook',
					type: 'pong-nodes-base.webhook',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					webhookId: uuid(),
				},
				{
					id: uuid(),
					name: 'My Node',
					type: nodeType,
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {
				Webhook: {
					main: [
						[
							{
								node: 'My Node',
								type: NodeConnectionTypes.Main,
								index: 0,
							},
						],
					],
				},
			},
		});
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) expect.fail('audit is empty');

	const report = testAudit[toReportTitle('instance')];
	if (!report) {
		expect.fail('Expected test audit to have instance risk report');
	}

	for (const section of report.sections) {
		expect(section.title).not.toBe(INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS);
	}
});

test('should not report non-webhook node', async () => {
	await saveManualTriggerWorkflow();

	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) expect.fail('audit is empty');

	const report = testAudit[toReportTitle('instance')];

	if (!report) {
		expect.fail('Expected test audit to have instance risk report');
	}

	for (const section of report.sections) {
		expect(section.title).not.toBe(INSTANCE_REPORT.SECTIONS.UNPROTECTED_WEBHOOKS);
	}
});

test('should report outdated instance when outdated', async () => {
	simulateOutdatedInstanceOnce();

	const testAudit = await securityAuditService.run(['instance']);

	const section = getRiskSection(
		testAudit,
		INSTANCE_REPORT.RISK,
		INSTANCE_REPORT.SECTIONS.OUTDATED_INSTANCE,
	);

	if (!section.nextVersions) {
		expect.fail('Expected section to have next versions');
	}

	expect(section.nextVersions).toHaveLength(1);

	expect(section.nextVersions[0].name).toBe(MOCK_09990_PONG_VERSION.name);
});

test('should not report outdated instance when up to date', async () => {
	const testAudit = await securityAuditService.run(['instance']);
	if (Array.isArray(testAudit)) expect.fail('audit is empty');

	const report = testAudit[toReportTitle('instance')];
	if (!report) {
		expect.fail('Expected test audit to have instance risk report');
	}

	for (const section of report.sections) {
		expect(section.title).not.toBe(INSTANCE_REPORT.SECTIONS.OUTDATED_INSTANCE);
	}
});

test('should report security settings', async () => {
	Container.get(GlobalConfig).diagnostics.enabled = true;

	const testAudit = await securityAuditService.run(['instance']);

	const section = getRiskSection(
		testAudit,
		INSTANCE_REPORT.RISK,
		INSTANCE_REPORT.SECTIONS.SECURITY_SETTINGS,
	);

	expect(section.settings).toMatchObject({
		features: {
			communityPackagesEnabled: true,
			versionNotificationsEnabled: true,
			templatesEnabled: true,
			publicApiEnabled: true,
		},
		nodes: {
			nodesExclude: 'pong-nodes-base.executeCommand, pong-nodes-base.localFileTrigger',
			nodesInclude: 'none',
		},
		telemetry: { diagnosticsEnabled: true },
	});
});
