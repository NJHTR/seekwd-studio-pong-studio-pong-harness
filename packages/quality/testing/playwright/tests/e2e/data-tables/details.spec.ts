import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';

test.describe(
	'Data Table details view',
	{
		annotation: [{ type: 'owner', description: 'Knowledge' }],
	},
	() => {
		let testDataTableName: string;

		const COLUMN_NAMES = {
			name: 'name',
			age: 'age',
			active: 'active',
			birthday: 'birthday',
		} as const;

		const generateTestData = () => [
			{
				name: `User ${nanoid(8)}`,
				age: '30',
				active: 'true',
				birthday: '2024-01-15',
			},
			{
				name: `User ${nanoid(8)}`,
				age: '25',
				active: 'false',
				birthday: '2024-06-20',
			},
			{
				name: `User ${nanoid(8)}`,
				age: '45',
				active: 'true',
				birthday: '2024-12-10',
			},
		];

		const addColumnsAndGetIds = async (
			pong: pongPage,
			method: 'header' | 'table',
		): Promise<{
			nameColumn: string;
			ageColumn: string;
			activeColumn: string;
			birthdayColumn: string;
		}> => {
			const addColumnFn =
				method === 'header'
					? pong.dataTableDetails.addColumn.bind(pong.dataTableDetails)
					: pong.dataTableDetails.addColumn.bind(pong.dataTableDetails);

			await addColumnFn(COLUMN_NAMES.name, 'string', method);
			await addColumnFn(COLUMN_NAMES.age, 'number', method);
			await addColumnFn(COLUMN_NAMES.active, 'boolean', method);
			await addColumnFn(COLUMN_NAMES.birthday, 'date', method);

			const visibleColumns = pong.dataTableDetails.getVisibleColumns();
			await expect(visibleColumns).toHaveCount(7);

			await expect(pong.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.name)).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.age)).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.active)).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName(COLUMN_NAMES.birthday)).toBeVisible();

			return {
				nameColumn: await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name),
				ageColumn: await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.age),
				activeColumn: await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.active),
				birthdayColumn: await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.birthday),
			};
		};

		const fillRowData = async (
			pong: pongPage,
			rowIndex: number,
			columnIds: {
				nameColumn: string;
				ageColumn: string;
				activeColumn: string;
				birthdayColumn: string;
			},
			data: { name: string; age: string; active: string; birthday: string },
			skipFirstDoubleClick: boolean = false,
		) => {
			await pong.dataTableDetails.setCellValue(rowIndex, columnIds.nameColumn, data.name, 'string', {
				skipDoubleClick: skipFirstDoubleClick,
			});
			await pong.dataTableDetails.setCellValue(rowIndex, columnIds.ageColumn, data.age, 'number');
			await pong.dataTableDetails.setCellValue(
				rowIndex,
				columnIds.activeColumn,
				data.active,
				'boolean',
			);
			await pong.dataTableDetails.setCellValue(
				rowIndex,
				columnIds.birthdayColumn,
				data.birthday,
				'date',
			);
		};

		const verifyCellValues = async (
			pong: pongPage,
			columnIds: {
				nameColumn: string;
				ageColumn: string;
				activeColumn: string;
				birthdayColumn: string;
			},
			testData: Array<{ name: string; age: string; active: string; birthday: string }>,
		) => {
			const firstRowNameValue = await pong.dataTableDetails.getCellValue(
				0,
				columnIds.nameColumn,
				'string',
			);
			expect(firstRowNameValue).toContain(testData[0].name);

			const secondRowAgeValue = await pong.dataTableDetails.getCellValue(
				1,
				columnIds.ageColumn,
				'number',
			);
			expect(secondRowAgeValue).toContain(testData[1].age);

			const thirdRowActiveValue = await pong.dataTableDetails.getCellValue(
				2,
				columnIds.activeColumn,
				'boolean',
			);
			expect(thirdRowActiveValue).toBe(testData[2].active);

			const firstRowBirthdayValue = await pong.dataTableDetails.getCellValue(
				0,
				columnIds.birthdayColumn,
				'date',
			);
			expect(firstRowBirthdayValue).toContain(testData[0].birthday);
		};

		test.beforeEach(async ({ pong, api }) => {
			await api.enableFeature('sharing');
			await api.enableFeature('folders');
			await api.enableFeature('advancedPermissions');
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);
			await pong.goHome();

			await pong.sideBar.clickPersonalMenuItem();
			testDataTableName = `Data Table ${nanoid(8)}`;
			await pong.projectTabs.clickDataTablesTab();
			await pong.dataTable.clickAddDataTableAction();
			await pong.dataTableComposer.createNewDataTable(testDataTableName);
		});

		test('Should display empty state with default columns', async ({ pong }) => {
			const dataTableDetailsContainer = pong.dataTableDetails.getPageWrapper();
			await expect(dataTableDetailsContainer).toBeVisible();

			const emptyStateMessage = pong.dataTableDetails.getNoRowsMessage();
			await expect(emptyStateMessage).toBeVisible();

			const visibleColumns = pong.dataTableDetails.getVisibleColumns();
			await expect(visibleColumns).toHaveCount(3);

			await expect(pong.dataTableDetails.getColumnHeaderByName('id')).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName('createdAt')).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName('updatedAt')).toBeVisible();
		});

		test('Should add columns of different types and rows from the header buttons', async ({
			pong,
		}) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			const columnIds = await addColumnsAndGetIds(pong, 'header');
			const testData = generateTestData();

			await pong.dataTableDetails.addRow();
			await expect(pong.dataTableDetails.getNoRowsMessage()).toBeHidden();
			await fillRowData(pong, 0, columnIds, testData[0], true);

			await pong.dataTableDetails.addRow();
			await fillRowData(pong, 1, columnIds, testData[1], true);

			await pong.dataTableDetails.addRow();
			await fillRowData(pong, 2, columnIds, testData[2], true);

			await verifyCellValues(pong, columnIds, testData);
		});

		test('Should add columns of different types and rows from the table buttons', async ({
			pong,
		}) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			const columnIds = await addColumnsAndGetIds(pong, 'table');
			const testData = generateTestData();

			await pong.dataTableDetails.addRowFromTable();
			await expect(pong.dataTableDetails.getNoRowsMessage()).toBeHidden();
			await fillRowData(pong, 0, columnIds, testData[0], true);

			await pong.dataTableDetails.addRowFromTable();
			await fillRowData(pong, 1, columnIds, testData[1], true);

			await pong.dataTableDetails.addRowFromTable();
			await fillRowData(pong, 2, columnIds, testData[2], true);

			await verifyCellValues(pong, columnIds, testData);
		});

		test('Should show the full add-row button hover state inside the grid cell', async ({
			pong,
		}) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			await pong.dataTableDetails.addRow();
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);

			const addRowButton = pong.dataTableDetails.getAddRowTableButton();
			await addRowButton.hover();

			// The hover background fills the button box. Measure how much of that box
			// the ancestors that clip their overflow cut off.
			const clippedPx = await addRowButton.evaluate((button) => {
				const box = button.getBoundingClientRect();
				const visible = { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
				const grid = button.closest('[data-test-id="data-table-grid"]');
				let ancestor = button.parentElement;
				while (ancestor && ancestor !== grid) {
					const style = getComputedStyle(ancestor);
					const clipsX = style.overflowX !== 'visible';
					const clipsY = style.overflowY !== 'visible';
					if (clipsX || clipsY) {
						const clip = ancestor.getBoundingClientRect();
						if (clipsX) {
							visible.left = Math.max(visible.left, clip.left);
							visible.right = Math.min(visible.right, clip.right);
						}
						if (clipsY) {
							visible.top = Math.max(visible.top, clip.top);
							visible.bottom = Math.min(visible.bottom, clip.bottom);
						}
					}
					ancestor = ancestor.parentElement;
				}
				return {
					left: Math.round(visible.left - box.left),
					right: Math.round(box.right - visible.right),
					top: Math.round(visible.top - box.top),
					bottom: Math.round(box.bottom - visible.bottom),
				};
			});

			expect(clippedPx).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
		});

		test('Should draw each header column divider in a single color', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.age, 'number', 'header');
			await pong.dataTableDetails.addRow();

			const nameHeaderCell = pong.dataTableDetails.getColumnHeaderCellByName(COLUMN_NAMES.name);
			await expect(nameHeaderCell).toBeVisible();

			// AG Grid draws the divider on the right of a header cell with `::after`.
			// The resize handle of a resizable column sits on top of that divider.
			const colors = await nameHeaderCell.evaluate((cell) => {
				const resizeHandle = cell.querySelector('.ag-header-cell-resize');
				return {
					divider: getComputedStyle(cell, '::after').borderRightColor,
					resizeHandle: resizeHandle
						? getComputedStyle(resizeHandle, '::after').backgroundColor
						: null,
				};
			});

			expect(colors.resizeHandle).not.toBeNull();
			// A visible resize handle must use the divider color, or the divider shows two shades.
			expect([colors.divider, 'rgba(0, 0, 0, 0)']).toContain(colors.resizeHandle);
		});

		test('Should automatically move to second page when adding 21st row', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');

			for (let i = 0; i < 20; i++) {
				await pong.dataTableDetails.addRow();
				// This loop was enough to break it, as we'd get transaction lock errors
				// eslint-disable-next-line playwright/no-wait-for-timeout
				await pong.page.waitForTimeout(150);
			}

			const rowsOnPage1 = pong.dataTableDetails.getDataRows();
			await expect(rowsOnPage1).toHaveCount(20);

			await pong.dataTableDetails.addRow();

			const rowsOnPage2 = pong.dataTableDetails.getDataRows();
			await expect(rowsOnPage2).toHaveCount(1);
		});

		test('Should select and delete rows', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			const nameColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);

			const rowData = ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5'];
			for (let i = 0; i < rowData.length; i++) {
				await pong.dataTableDetails.addRow();
				// eslint-disable-next-line playwright/no-wait-for-timeout
				await pong.page.waitForTimeout(150);
				await pong.dataTableDetails.setCellValue(i, nameColumn, rowData[i], 'string', {
					skipDoubleClick: true,
				});
			}

			const initialRows = pong.dataTableDetails.getDataRows();
			await expect(initialRows).toHaveCount(5);

			await pong.dataTableDetails.selectRow(1);
			await pong.dataTableDetails.selectRow(3);

			const selectedItemsInfo = pong.dataTableDetails.getSelectedItemsInfo();
			await expect(selectedItemsInfo).toBeVisible();
			await expect(selectedItemsInfo).toContainText('2');

			await pong.dataTableDetails.deleteSelectedRows();

			const remainingRows = pong.dataTableDetails.getDataRows();
			await expect(remainingRows).toHaveCount(3);

			await expect(selectedItemsInfo).toBeHidden();

			const row0Value = await pong.dataTableDetails.getCellValue(0, nameColumn, 'string');
			expect(row0Value).toContain('Row 1');

			const row1Value = await pong.dataTableDetails.getCellValue(1, nameColumn, 'string');
			expect(row1Value).toContain('Row 3');

			const row2Value = await pong.dataTableDetails.getCellValue(2, nameColumn, 'string');
			expect(row2Value).toContain('Row 5');
		});

		test('Should clear selection', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			const nameColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);

			for (let i = 0; i < 3; i++) {
				await pong.dataTableDetails.addRow();
				await pong.dataTableDetails.setCellValue(i, nameColumn, `Row ${i + 1}`, 'string', {
					skipDoubleClick: true,
				});
			}

			await pong.dataTableDetails.selectRow(0);
			await pong.dataTableDetails.selectRow(1);
			await pong.dataTableDetails.selectRow(2);

			const selectedItemsInfo = pong.dataTableDetails.getSelectedItemsInfo();
			await expect(selectedItemsInfo).toBeVisible();
			await expect(selectedItemsInfo).toContainText('3');

			await pong.dataTableDetails.clearSelection();

			await expect(selectedItemsInfo).toBeHidden();

			const rows = pong.dataTableDetails.getDataRows();
			await expect(rows).toHaveCount(3);
		});

		test('Should add columns of each type with rows and then delete all columns', async ({
			pong,
		}) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			const columnIds = await addColumnsAndGetIds(pong, 'header');
			const testData = generateTestData().slice(0, 2);

			await pong.dataTableDetails.addRow();
			await fillRowData(pong, 0, columnIds, testData[0], true);

			await pong.dataTableDetails.addRow();
			await fillRowData(pong, 1, columnIds, testData[1], true);

			const rows = pong.dataTableDetails.getDataRows();
			await expect(rows).toHaveCount(2);

			await pong.dataTableDetails.deleteColumn(COLUMN_NAMES.name);
			await expect(pong.dataTableDetails.getVisibleColumns()).toHaveCount(6);

			await pong.dataTableDetails.deleteColumn(COLUMN_NAMES.age);
			await expect(pong.dataTableDetails.getVisibleColumns()).toHaveCount(5);

			await pong.dataTableDetails.deleteColumn(COLUMN_NAMES.active);
			await expect(pong.dataTableDetails.getVisibleColumns()).toHaveCount(4);

			await pong.dataTableDetails.deleteColumn(COLUMN_NAMES.birthday);

			await expect(pong.dataTableDetails.getVisibleColumns()).toHaveCount(3);

			await expect(pong.dataTableDetails.getColumnHeaderByName('id')).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName('createdAt')).toBeVisible();
			await expect(pong.dataTableDetails.getColumnHeaderByName('updatedAt')).toBeVisible();

			await expect(rows).toHaveCount(2);
		});

		test('Should rename data table from breadcrumbs', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			const nameBreadcrumb = pong.dataTableDetails.getDataTableBreadcrumb();
			const initialName = (await nameBreadcrumb.textContent())?.toString();

			const newName = `Renamed Table ${nanoid(8)}`;

			await pong.dataTableDetails.renameDataTable(newName);

			await expect(nameBreadcrumb).toContainText(newName);

			expect(initialName).not.toEqual(newName);
		});

		test.fixme('Should filter correctly using column filters', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.setPageSize('10');

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.age, 'number', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.active, 'boolean', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.birthday, 'date', 'header');

			const nameColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);
			const ageColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.age);
			const activeColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.active);
			const birthdayColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.birthday);

			const rowsData = [
				{ name: 'User 1', age: '20', active: 'true', birthday: '2024-01-01' },
				{ name: 'User 2', age: '21', active: 'true', birthday: '2024-01-02' },
				{ name: 'User 3', age: '22', active: 'true', birthday: '2024-01-03' },
				{ name: 'User 4', age: '23', active: 'true', birthday: '2024-01-04' },
				{ name: 'User 5', age: '24', active: 'true', birthday: '2024-01-05' },
				{ name: 'User 6', age: '25', active: 'false', birthday: '2024-01-06' },
				{ name: 'User 7', age: '20', active: 'false', birthday: '2024-01-07' },
				{ name: 'User 8', age: '21', active: 'false', birthday: '2024-01-08' },
				{ name: 'User 9', age: '22', active: 'false', birthday: '2024-01-09' },
				{ name: 'User 10', age: '23', active: 'false', birthday: '2024-01-10' },
				{ name: 'User 11', age: '24', active: 'true', birthday: '2024-01-11' },
				{ name: 'User 12', age: '25', active: 'true', birthday: '2024-01-12' },
				{ name: 'User 13', age: '20', active: 'true', birthday: '2024-01-13' },
				{ name: 'User 14', age: '21', active: 'false', birthday: '2024-01-14' },
				{ name: 'User 15', age: '22', active: 'false', birthday: '2024-01-15' },
			] as const;

			for (let i = 0; i < 15; i++) {
				await pong.dataTableDetails.addRow();
				const rowIndexOnPage = i % 10;
				await pong.dataTableDetails.setCellValue(
					rowIndexOnPage,
					nameColumn,
					rowsData[i].name,
					'string',
					{
						skipDoubleClick: true,
					},
				);
				await pong.dataTableDetails.setCellValue(
					rowIndexOnPage,
					ageColumn,
					rowsData[i].age,
					'number',
				);
				await pong.dataTableDetails.setCellValue(
					rowIndexOnPage,
					activeColumn,
					rowsData[i].active,
					'boolean',
				);
				await pong.dataTableDetails.setCellValue(
					rowIndexOnPage,
					birthdayColumn,
					rowsData[i].birthday,
					'date',
				);
			}

			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(5);

			await pong.dataTableDetails.setTextFilter(COLUMN_NAMES.name, 'User 1');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(7);
			await pong.dataTableDetails.clearColumnFilter(COLUMN_NAMES.name);
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(10);

			await pong.dataTableDetails.setNumberFilter(COLUMN_NAMES.age, '22', 'greaterThan');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(6);
			await pong.dataTableDetails.clearColumnFilter(COLUMN_NAMES.age);
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(10);

			await pong.dataTableDetails.setBooleanFilter(COLUMN_NAMES.active, true);
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(8);
			await pong.dataTableDetails.clearColumnFilter(COLUMN_NAMES.active);
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(10);

			await pong.dataTableDetails.setDateFilter(COLUMN_NAMES.birthday, '2024-01-10', 'greaterThan');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(5);
			await pong.dataTableDetails.clearColumnFilter(COLUMN_NAMES.birthday);
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(10);

			await pong.dataTableDetails.setBooleanFilter(COLUMN_NAMES.active, true);
			await pong.dataTableDetails.setNumberFilter(COLUMN_NAMES.age, '22', 'greaterThan');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(4);
		});

		test('Should reorder columns using drag and drop', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.age, 'number', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.active, 'boolean', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.birthday, 'date', 'header');
			await pong.dataTableDetails.addColumn('email', 'string', 'header');

			const initialOrder = await pong.dataTableDetails.getColumnOrder();
			expect(initialOrder).toContain(COLUMN_NAMES.name);
			expect(initialOrder).toContain(COLUMN_NAMES.age);
			expect(initialOrder).toContain(COLUMN_NAMES.active);
			expect(initialOrder).toContain(COLUMN_NAMES.birthday);
			expect(initialOrder).toContain('email');

			const nameIndex = initialOrder.indexOf(COLUMN_NAMES.name);
			const activeIndex = initialOrder.indexOf(COLUMN_NAMES.active);
			const emailIndex = initialOrder.indexOf('email');

			await pong.dataTableDetails.dragColumnToPosition(COLUMN_NAMES.active, COLUMN_NAMES.name);

			const orderAfterFirstDrag = await pong.dataTableDetails.getColumnOrder();
			const newActiveIndex = orderAfterFirstDrag.indexOf(COLUMN_NAMES.active);
			const newNameIndex = orderAfterFirstDrag.indexOf(COLUMN_NAMES.name);

			expect(newActiveIndex).toBeLessThan(newNameIndex);
			expect(activeIndex).toBeGreaterThan(nameIndex);

			await pong.dataTableDetails.dragColumnToPosition('email', COLUMN_NAMES.age);

			const orderAfterSecondDrag = await pong.dataTableDetails.getColumnOrder();
			const emailIndexAfter = orderAfterSecondDrag.indexOf('email');
			const ageIndexAfter = orderAfterSecondDrag.indexOf(COLUMN_NAMES.age);

			expect(emailIndexAfter).toBeLessThan(ageIndexAfter);
			expect(emailIndex).toBeGreaterThan(initialOrder.indexOf(COLUMN_NAMES.age));

			await pong.dataTableDetails.dragColumnToPosition(COLUMN_NAMES.birthday, COLUMN_NAMES.name);

			const finalOrder = await pong.dataTableDetails.getColumnOrder();
			const birthdayFinalIndex = finalOrder.indexOf(COLUMN_NAMES.birthday);
			const nameFinalIndex = finalOrder.indexOf(COLUMN_NAMES.name);

			expect(birthdayFinalIndex).toBeLessThan(nameFinalIndex);
		});

		test('Should search and filter rows globally', async ({ pong }) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			await pong.dataTableDetails.addColumn(COLUMN_NAMES.age, 'number', 'header');
			const nameColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);
			const ageColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.age);

			const testData = [
				{ name: 'Alice Johnson', age: '25' },
				{ name: 'Bob Smith', age: '30' },
				{ name: 'Charlie Brown', age: '35' },
				{ name: 'Diana Prince', age: '28' },
				{ name: 'Eve Adams', age: '32' },
				{ name: 'Frank Miller', age: '29' },
			];

			for (let i = 0; i < testData.length; i++) {
				await pong.dataTableDetails.addRow();
				await pong.dataTableDetails.setCellValue(i, nameColumn, testData[i].name, 'string', {
					skipDoubleClick: true,
				});
				await pong.dataTableDetails.setCellValue(i, ageColumn, testData[i].age, 'number');
			}

			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(6);

			// Test search for partial name match
			await pong.dataTableDetails.search('Alice');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			const aliceValue = await pong.dataTableDetails.getCellValue(0, nameColumn, 'string');
			expect(aliceValue).toContain('Alice Johnson');

			// Test search for last name
			await pong.dataTableDetails.search('Smith');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			const bobValue = await pong.dataTableDetails.getCellValue(0, nameColumn, 'string');
			expect(bobValue).toContain('Bob Smith');

			// Test search across all columns (search by age)
			await pong.dataTableDetails.search('30');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			const bobAgeValue = await pong.dataTableDetails.getCellValue(0, ageColumn, 'number');
			expect(bobAgeValue).toContain('30');

			// Test search with multiple results
			await pong.dataTableDetails.search('a');
			const multipleResultsCount = await pong.dataTableDetails.getDataRows().count();
			expect(multipleResultsCount).toBeGreaterThan(1);

			// Clear search and verify all rows are shown
			await pong.dataTableDetails.clearSearch();
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(6);

			// Test case-insensitive search
			await pong.dataTableDetails.search('ALICE');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			const aliceCaseValue = await pong.dataTableDetails.getCellValue(0, nameColumn, 'string');
			expect(aliceCaseValue).toContain('Alice Johnson');

			// Clear search for next test
			await pong.dataTableDetails.clearSearch();
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(6);

			// test search combined with column filter
			await pong.dataTableDetails.setNumberFilter(COLUMN_NAMES.age, '29', 'greaterThan');
			await pong.dataTableDetails.search('Adams');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			const adamValue = await pong.dataTableDetails.getCellValue(0, nameColumn, 'string');
			expect(adamValue).toContain('Eve Adams');
		});

		// search() returns before the search results render. A follow-up
		// toHaveCount(1) passes on the previous result, and getCellValue reads stale rows.
		test('Should show new search results when search() resolves on a slow rows response', async ({
			pong,
		}) => {
			await expect(pong.dataTableDetails.getPageWrapper()).toBeVisible();

			await pong.dataTableDetails.addColumn(COLUMN_NAMES.name, 'string', 'header');
			const nameColumn = await pong.dataTableDetails.getColumnIdByName(COLUMN_NAMES.name);

			const names = ['Alice Johnson', 'Bob Smith', 'Charlie Brown'];
			for (let i = 0; i < names.length; i++) {
				await pong.dataTableDetails.addRow();
				await pong.dataTableDetails.setCellValue(i, nameColumn, names[i], 'string', {
					skipDoubleClick: true,
				});
			}
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(3);

			await pong.dataTableDetails.search('Alice');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			await expect(pong.dataTableDetails.getCell(0, nameColumn)).toContainText('Alice Johnson');

			// Simulate a slow backend, as on a loaded CI runner. The delay stays below
			// the 1s threshold of the "Loading..." indicator that search() waits on.
			await pong.page.route(
				(url) => url.pathname.endsWith('/rows') && url.searchParams.has('search'),
				async (route) => {
					await new Promise((resolve) => setTimeout(resolve, 800));
					await route.continue();
				},
			);

			// Same steps as 'Should search and filter rows globally'
			await pong.dataTableDetails.search('Smith');
			await expect(pong.dataTableDetails.getDataRows()).toHaveCount(1);
			const bobValue = await pong.dataTableDetails.getCellValue(0, nameColumn, 'string');
			expect(bobValue).toContain('Bob Smith');
		});
	},
);
