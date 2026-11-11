import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Data Table list view',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		test.beforeEach(async ({ pong, api }) => {
			await api.enableFeature('sharing');
			await api.enableFeature('folders');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);
			await pong.goHome();
		});

		test('Should correctly render project data tables in project and everything in overview', async ({
			pong,
		}) => {
			const TEST_PROJECTS = [
				{
					name: `Project ${nanoid(8)}`,
					dataTable: `Data Table ${nanoid(8)}`,
				},
				{
					name: `Project ${nanoid(8)}`,
					dataTable: `Data Table ${nanoid(8)}`,
				},
			];

			// Create projects and check that they only render their own data tables
			for (const project of TEST_PROJECTS) {
				await pong.dataTableComposer.createDataTableInNewProject(
					project.name,
					project.dataTable,
					'empty-state',
				);

				await expect(pong.dataTable.getDataTableCardByName(project.dataTable)).toBeVisible();
				await expect(pong.dataTable.getDataTableCards()).toHaveCount(1);
			}

			// Go to overview, both data tables should be visible
			await pong.navigate.toDatatables();
			for (const project of TEST_PROJECTS) {
				await expect(pong.dataTable.getDataTableCardByName(project.dataTable)).toBeVisible();
			}
		});

		test('Should create data table in personal project when created from Overview', async ({
			pong,
		}) => {
			const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

			await pong.navigate.toDatatables('home');

			await pong.dataTable.clickAddDataTableAction();

			const newDataTableModal = pong.dataTable.getNewDataTableModal();
			await expect(newDataTableModal).toBeVisible();

			await pong.dataTableComposer.createNewDataTable(TEST_DATA_TABLE_NAME);

			const dataTableDetailsContainer = pong.dataTableDetails.getPageWrapper();
			await expect(dataTableDetailsContainer).toBeVisible();

			const dataTableProjectBreadcrumb = pong.dataTableDetails.getDataTableProjectBreadcrumb();
			await expect(dataTableProjectBreadcrumb).toHaveText('Personal');

			const dataTableBreadcrumb = pong.dataTableDetails.getDataTableBreadcrumb();
			await expect(dataTableBreadcrumb).toContainText(TEST_DATA_TABLE_NAME);
		});

		test('Should create data table from project empty state', async ({ pong }) => {
			const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
			const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

			await pong.dataTableComposer.createDataTableInNewProject(
				TEST_PROJECT_NAME,
				TEST_DATA_TABLE_NAME,
				'empty-state',
			);

			await expect(pong.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeVisible();
		});

		test('Should create project data table from header dropdown', async ({ pong }) => {
			const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
			const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

			await pong.dataTableComposer.createDataTableInNewProject(
				TEST_PROJECT_NAME,
				TEST_DATA_TABLE_NAME,
				'header-dropdown',
			);

			await expect(pong.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeVisible();
		});

		test('Should create data table from workflows tab', async ({ pong }) => {
			const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
			const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

			await pong.dataTableComposer.createDataTableInNewProject(
				TEST_PROJECT_NAME,
				TEST_DATA_TABLE_NAME,
				'header-dropdown',
				false,
			);

			await expect(pong.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeVisible();
		});

		test('Should delete data table from card actions', async ({ pong }) => {
			const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
			const TEST_DATA_TABLE_NAME = `Data Table ${nanoid(8)}`;

			await pong.dataTableComposer.createDataTableInNewProject(
				TEST_PROJECT_NAME,
				TEST_DATA_TABLE_NAME,
				'empty-state',
			);

			await pong.dataTable.clickDataTableCardActionsButton(TEST_DATA_TABLE_NAME);
			await pong.dataTable.getDataTableCardAction('delete').click();

			await expect(pong.dataTable.getDeleteDataTableModal()).toBeVisible();
			await pong.dataTable.clickDeleteDataTableConfirmButton();

			await expect(pong.dataTable.getDataTableCardByName(TEST_DATA_TABLE_NAME)).toBeHidden();
		});

		test('Should paginate data table list correctly', async ({ pong }) => {
			const TEST_PROJECT_NAME = `Project ${nanoid(8)}`;
			const TOTAL_DATA_TABLES = 11;
			const PAGE_SIZE = 10;

			const { projectId } = await pong.projectComposer.createProject(TEST_PROJECT_NAME);
			await pong.navigate.toDatatables(projectId);

			// Create just enough data tables to require pagination
			for (let i = 0; i < TOTAL_DATA_TABLES; i++) {
				await pong.dataTable.clickAddDataTableAction();
				await pong.dataTableComposer.createNewDataTable(`Data Table ${i + 1}`);
				await pong.sideBar.clickProjectMenuItem(TEST_PROJECT_NAME);
				await pong.dataTable.clickDataTableProjectTab();
			}
			// Change page size to PAGE_SIZE
			await pong.dataTable.selectDataTablePageSize(PAGE_SIZE.toString());
			// First page should only have PAGE_SIZE items
			await expect(pong.dataTable.getDataTableCards()).toHaveCount(PAGE_SIZE);

			// Forward to next page, should show the rest
			await pong.dataTable.getPaginationNextButton().click();
			await expect(pong.dataTable.getDataTableCards()).toHaveCount(TOTAL_DATA_TABLES - PAGE_SIZE);
		});
	},
);
