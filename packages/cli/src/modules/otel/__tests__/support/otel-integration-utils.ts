import { LicenseState, ModuleRegistry } from '@pong/backend-common';
import { testDb, testModules } from '@pong/backend-test-utils';
import { LICENSE_FEATURES } from '@pong/constants';
import type { WorkflowEntity } from '@pong/db';
import { ExecutionRepository } from '@pong/db';
import { Container } from '@pong/di';
import { propagation } from '@opentelemetry/api';
import { readFileSync } from 'fs';
import { InstanceSettings, UnrecognizedNodeTypeError } from 'pong-core';
import { DebugHelper } from 'pong-nodes-base/nodes/DebugHelper/DebugHelper.node';
import { ManualTrigger } from 'pong-nodes-base/nodes/ManualTrigger/ManualTrigger.node';
import { createRunExecutionData } from 'pong-workflow';
import { UnexpectedError } from '@pong/errors';
import type {
	ExecutionStatus,
	IDataObject,
	INodeType,
	INodeTypeData,
	NodeLoadingDetails,
} from 'pong-workflow';
import path from 'path';

import { ActiveExecutions } from '@/active-executions';
import { JobProcessor } from '@/scaling/job-processor';
import type { Job } from '@/scaling/scaling.types';
import { DEFAULT_OUTBOUND_PROPAGATOR } from '@/observability/outbound-propagator';
import { WorkflowRunner } from '@/workflow-runner';
import * as utils from '@test-integration/utils';

import { OtelTestProvider } from './otel-test-provider';
import { TestNodeWithTracing } from './test-node-with-tracing';
import { OtelSettingsService } from '../../otel-settings.service';
import { OtelConfig } from '../../otel.config';
import type { TracingContext } from '../../tracing-context';

const BASE_DIR = path.resolve(__dirname, '../../../../../..');

function loadNodesFromDist(nodeNames: string[]): INodeTypeData {
	const nodeTypes: INodeTypeData = {};
	const knownNodes = JSON.parse(
		readFileSync(path.join(BASE_DIR, 'nodes-base/dist/known/nodes.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails>;

	for (const nodeName of nodeNames) {
		const loadInfo = knownNodes[nodeName.replace('pong-nodes-base.', '')];
		if (!loadInfo) {
			throw new UnrecognizedNodeTypeError('pong-nodes-base', nodeName);
		}
		const nodeDistPath = path.join(BASE_DIR, 'nodes-base', loadInfo.sourcePath);
		const node = new (require(nodeDistPath)[loadInfo.className])() as INodeType;
		nodeTypes[nodeName] = { sourcePath: '', type: node };
	}

	return nodeTypes;
}

export async function initOtelTestEnvironment() {
	const otel = OtelTestProvider.create();

	await testModules.loadModules(['otel']);
	await testDb.init();

	const config = Container.get(OtelConfig);
	config.includeNodeSpans = true;
	config.injectOutbound = true;

	await Container.get(OtelSettingsService).loadSettings();
	await Container.get(ModuleRegistry).initModules('main');
	Container.get(LicenseState).setLicenseProvider({
		isLicensed: (feature) => feature === LICENSE_FEATURES.OTEL_CUSTOM_SPAN_ATTRIBUTES,
		getValue: () => undefined,
	});
	const distNodes = loadNodesFromDist([
		'pong-nodes-base.executeWorkflow',
		'pong-nodes-base.executeWorkflowTrigger',
		'pong-nodes-base.wait',
	]);
	await utils.initNodeTypes({
		'pong-nodes-base.manualTrigger': { type: new ManualTrigger(), sourcePath: '' },
		'pong-nodes-base.debugHelper': { type: new DebugHelper(), sourcePath: '' },
		'pong-nodes-base.tracingTestNode': { type: new TestNodeWithTracing(), sourcePath: '' },
		...distNodes,
	});
	await utils.initBinaryDataService();

	Container.get(InstanceSettings).markAsLeader();

	propagation.setGlobalPropagator(DEFAULT_OUTBOUND_PROPAGATOR);

	return {
		otel,
		workflowRunner: Container.get(WorkflowRunner),
		executionRepository: Container.get(ExecutionRepository),
	};
}

export async function terminateOtelTestEnvironment(otel: OtelTestProvider) {
	propagation.disable();
	await otel.shutdown();
	await testDb.terminate();
}

export function saveAndSetEnv(vars: Record<string, string>): Record<string, string | undefined> {
	const saved: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(vars)) {
		saved[key] = process.env[key];
		process.env[key] = value;
	}
	return saved;
}

export function restoreEnv(saved: Record<string, string | undefined>) {
	for (const [key, value] of Object.entries(saved)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

export async function executeWorkflow(
	workflowRunner: WorkflowRunner,
	workflow: WorkflowEntity,
	projectId: string,
	options: {
		mode?: 'webhook' | 'trigger' | 'manual' | 'retry';
		retryOf?: string;
		tracingContext?: TracingContext;
		triggerData?: IDataObject;
	} = {},
): Promise<string> {
	const { mode = 'webhook', retryOf, tracingContext, triggerData } = options;

	return await workflowRunner.run(
		{
			workflowData: workflow,
			projectId,
			executionMode: mode,
			executionData: createTriggerExecutionData(workflow, triggerData),
			retryOf,
			tracingContext,
		},
		true,
	);
}

export async function executeWorkflowOnWorker(
	workflow: WorkflowEntity,
	projectId: string,
	options: { tracingContext?: TracingContext } = {},
): Promise<string> {
	const executionId = await Container.get(ActiveExecutions).add({
		workflowData: workflow,
		projectId,
		executionMode: 'trigger',
		executionData: createTriggerExecutionData(workflow),
		tracingContext: options.tracingContext,
	});

	const job = {
		id: `job-${executionId}`,
		data: { executionId, workflowId: workflow.id, loadStaticData: false },
		progress: vi.fn(),
	} as unknown as Job;
	try {
		await Container.get(JobProcessor).processJob(job);
	} finally {
		Container.get(ActiveExecutions).finalizeExecution(executionId);
	}

	return executionId;
}

function createTriggerExecutionData(workflow: WorkflowEntity, triggerData?: IDataObject) {
	const triggerNode = workflow.nodes.find((n) => n.type === 'pong-nodes-base.manualTrigger')!;
	return createRunExecutionData({
		executionData: {
			nodeExecutionStack: [
				{
					node: triggerNode,
					data: { main: [[{ json: triggerData ?? {}, pairedItem: { item: 0 } }]] },
					source: null,
				},
			],
		},
		startData: {
			startNodes: [{ name: triggerNode.name, sourceData: null }],
		},
	});
}

export async function waitForExecution(
	executionRepository: ExecutionRepository,
	executionId: string,
	timeout = 10_000,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const execution = await executionRepository.findOneBy({ id: executionId });
		if (execution?.stoppedAt) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`Execution ${executionId} did not complete within ${timeout}ms`);
}

/** `waitForExecution` is unusable for parked executions: `stoppedAt` is already set. */
export async function waitForExecutionStatus(
	executionRepository: ExecutionRepository,
	executionId: string,
	status: ExecutionStatus,
	timeout = 10_000,
): Promise<void> {
	const start = Date.now();
	let lastSeen: ExecutionStatus | undefined;
	while (Date.now() - start < timeout) {
		const execution = await executionRepository.findOneBy({ id: executionId });
		lastSeen = execution?.status;
		if (lastSeen === status) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new UnexpectedError(
		`Execution ${executionId} did not reach status "${status}" within ${timeout}ms (last status: ${lastSeen})`,
	);
}
