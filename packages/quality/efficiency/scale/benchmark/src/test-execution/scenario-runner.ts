import { sleep } from 'zx';

import { AuthenticatedPongApiClient } from '@/pong-api-client/authenticated-pong-api-client';
import type { PongApiClient } from '@/pong-api-client/pong-api-client';
import type { WorkflowEngineType } from '@/pong-api-client/pong-api-client.types';
import type { ScenarioDataFileLoader } from '@/scenario/scenario-data-loader';
import { ScenarioDataImporter } from '@/test-execution/scenario-data-importer';
import type { Scenario } from '@/types/scenario';

import type { K6Executor } from './k6-executor';

/**
 * Runs scenarios
 */
export class ScenarioRunner {
	constructor(
		private readonly pongClient: PongApiClient,
		private readonly dataLoader: ScenarioDataFileLoader,
		private readonly k6Executor: K6Executor,
		private readonly ownerConfig: {
			email: string;
			password: string;
		},
		private readonly scenarioPrefix: string,
		private readonly engineType?: WorkflowEngineType,
	) {}

	async runManyScenarios(scenarios: Scenario[]) {
		console.log(`Waiting for pong ${this.pongClient.apiBaseUrl} to become online`);
		await this.pongClient.waitForInstanceToBecomeOnline();

		console.log('Setting up owner');
		await this.pongClient.setupOwnerIfNeeded(this.ownerConfig);

		const authenticatedPongClient = await AuthenticatedPongApiClient.createUsingUsernameAndPassword(
			this.pongClient,
			this.ownerConfig,
		);
		const testDataImporter = new ScenarioDataImporter(authenticatedPongClient, this.engineType);

		for (const scenario of scenarios) {
			await this.runSingleTestScenario(testDataImporter, scenario);
		}
	}

	private async runSingleTestScenario(testDataImporter: ScenarioDataImporter, scenario: Scenario) {
		const scenarioRunName = this.formTestScenarioRunName(scenario);
		if (this.engineType && !scenario.supportedEngines.includes(this.engineType)) {
			console.log(
				`Skipping scenario ${scenarioRunName}: it does not support engine ${this.engineType}`,
			);
			return;
		}

		console.log('Running scenario:', scenarioRunName);

		console.log('Loading and importing data');
		const testData = this.dataLoader.loadDataForScenario(scenario);
		const { dataTableId } = await testDataImporter.importTestScenarioData(testData);

		// Wait for 1s before executing the scenario to ensure that the workflows are activated.
		// In multi-main mode it can take some time before the workflow becomes active.
		await sleep(1000);

		console.log('Executing scenario script');
		await this.k6Executor.executeTestScenario(
			{
				...scenario,
				dataTableId,
			},
			{
				scenarioRunName,
			},
		);
	}

	/**
	 * Forms a name for the scenario by combining prefix and scenario name.
	 * The benchmarks are ran against different pong setups, so we use the
	 * prefix to differentiate between them.
	 */
	private formTestScenarioRunName(scenario: Scenario) {
		return `${this.scenarioPrefix}-${scenario.name}`;
	}
}
