import {
	setupAdminViewsExecutionsList,
	viewExecutionsListAsAdmin,
} from '../../../../composables/journeys/admin-views-executions-list';
import { test } from '../../../../fixtures/base';
import { benchConfig } from '../../../../playwright-projects';
import type { ApiHelpers } from '../../../../services/api-helper';
import { bulkSeedExecutions } from '../harness/bulk-seed-executions';
import { loopUiScenario } from '../harness/loop-ui-scenario';
import { measureLoadImpact } from '../harness/measure-load-impact';

const ITERATIONS = 30;
const WORKFLOWS_IN_PROJECT = 400;
const PRESEEDED_EXECUTIONS = 1_000_000;
const CREATE_BATCH_SIZE = 20;

test.use({
	capability: benchConfig('executions-list-customer-scale', {
		env: {
			EXECUTIONS_DATA_SAVE_ON_SUCCESS: 'all',
			EXECUTIONS_DATA_PRUNE: 'false',
		},
	}),
});

async function inflateProjectWorkflows(
	api: ApiHelpers,
	projectId: string,
	target: number,
	existing: number,
): Promise<void> {
	const toAdd = Math.max(0, target - existing);
	if (toAdd === 0) return;
	for (let offset = 0; offset < toAdd; offset += CREATE_BATCH_SIZE) {
		const batch = Math.min(CREATE_BATCH_SIZE, toAdd - offset);
		await Promise.all(
			Array.from({ length: batch }, async () => await api.workflows.createInProject(projectId)),
		);
	}
}

test.describe(
	'What is the PG impact of opening the executions list on a customer-shaped instance?',
	{
		tag: '@bench:ui',
		annotation: [
			{ type: 'owner', description: 'Catalysts' },
			{ type: 'question', description: 'executions-list-customer-scale' },
		],
	},
	() => {
		test(`Admin opens /projects/:id/executions ×${ITERATIONS} | ${WORKFLOWS_IN_PROJECT} wf | ${PRESEEDED_EXECUTIONS} execs`, async ({
			services,
			pong,
		}, testInfo) => {
			const ctx = await setupAdminViewsExecutionsList(pong.api);
			await inflateProjectWorkflows(
				pong.api,
				ctx.project.id,
				WORKFLOWS_IN_PROJECT,
				ctx.workflows.length,
			);
			await bulkSeedExecutions(services, {
				projectId: ctx.project.id,
				count: PRESEEDED_EXECUTIONS,
			});

			const adminPong = await pong.start.withUser(ctx.admin);

			await measureLoadImpact({
				services,
				testInfo,
				drivers: [
					{
						name: 'ui',
						run: () =>
							loopUiScenario({
								pong: adminPong,
								scenario: (page) => viewExecutionsListAsAdmin(page, ctx),
								repeats: ITERATIONS,
							}),
					},
				],
				dimensions: {
					journey: 'admin-views-executions-list',
					workflowsInProject: WORKFLOWS_IN_PROJECT,
					preseededExecutions: PRESEEDED_EXECUTIONS,
				},
			});
		});
	},
);
