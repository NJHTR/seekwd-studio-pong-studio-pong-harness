import { test, expect } from '../../../../fixtures/base';

test.describe
	.serial('Worker View', () => {
		test.describe(
			'unlicensed',
			{
				annotation: [{ type: 'owner', description: 'Catalysts' }],
			},
			() => {
				test.beforeEach(async ({ pong }) => {
					await pong.api.disableFeature('workerView');
					await pong.api.disableFeature('workerView');
					await pong.api.setQueueMode(false);
				});

				test('should not show up in the menu sidebar', async ({ pong }) => {
					await pong.workerView.goto();
					await expect(pong.workerView.getWorkerMenuItem()).toBeHidden();
				});

				test('should show action box', async ({ pong }) => {
					await pong.workerView.goto();
					await expect(pong.workerView.getWorkerViewUnlicensed()).toBeVisible();
				});
			},
		);

		test.describe('licensed', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.api.enableFeature('workerView');
				await pong.api.setQueueMode(true);
			});

			test('should show up in the menu sidebar', async ({ pong }) => {
				await pong.workerView.goto();
				await expect(pong.workerView.getWorkerMenuItem()).toBeVisible();
			});

			test('should show worker list view', async ({ pong }) => {
				await pong.workerView.goto();
				await expect(pong.workerView.getWorkerViewLicensed()).toBeVisible();
			});
		});
	});
