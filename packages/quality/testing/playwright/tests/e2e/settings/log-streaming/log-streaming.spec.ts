import { test, expect } from '../../../../fixtures/base';

const DESTINATION_NAMES = {
	FIRST: 'Destination 0',
	SECOND: 'Destination 1',
} as const;

const MODAL_MAX_WIDTH = 500;

test.describe(
	'Log Streaming Settings',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });
		test.describe('unlicensed', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.api.disableFeature('logStreaming');
			});

			test('should show the unlicensed view when the feature is disabled', async ({ pong }) => {
				await pong.navigate.toLogStreaming();
				await expect(pong.settingsLogStreaming.getActionBoxUnlicensed()).toBeVisible();
				await expect(pong.settingsLogStreaming.getContactUsButton()).toBeVisible();
				await expect(pong.settingsLogStreaming.getActionBoxLicensed()).not.toBeAttached();
			});
		});

		// @licensed - requires enterprise license (module routes only exist with license at startup)
		test.describe('licensed @licensed', () => {
			test.beforeEach(async ({ pong }) => {
				await pong.api.enableFeature('logStreaming');
				await pong.api.deleteAllLogStreamingDestinations();
				await pong.navigate.toLogStreaming();
			});

			test('should show the licensed view when the feature is enabled', async ({ pong }) => {
				await expect(pong.settingsLogStreaming.getActionBoxLicensed()).toBeVisible();
				await expect(pong.settingsLogStreaming.getAddFirstDestinationButton()).toBeVisible();
				await expect(pong.settingsLogStreaming.getActionBoxUnlicensed()).not.toBeAttached();
			});

			test('should show the add destination modal', async ({ pong }) => {
				await pong.settingsLogStreaming.addDestination();
				await expect(pong.settingsLogStreaming.getDestinationModal()).toBeVisible();
				await expect(pong.settingsLogStreaming.getSelectDestinationType()).toBeVisible();
				await expect(pong.settingsLogStreaming.getSelectDestinationButton()).toBeVisible();
				await expect(pong.settingsLogStreaming.getSelectDestinationButton()).toBeDisabled();

				const modal = pong.settingsLogStreaming.getDestinationModal();
				const width = await modal.evaluate((element) => {
					return parseInt(window.getComputedStyle(element).width.replace('px', ''));
				});
				expect(width).toBeLessThan(MODAL_MAX_WIDTH);

				await pong.settingsLogStreaming.clickSelectDestinationType();
				await pong.settingsLogStreaming.selectDestinationType(0);
				await expect(pong.settingsLogStreaming.getSelectDestinationButton()).toBeEnabled();
				await pong.settingsLogStreaming.closeModalByClickingOverlay();
				await expect(pong.settingsLogStreaming.getDestinationModal()).not.toBeAttached();
			});

			test('should create a destination and delete it', async ({ pong }) => {
				await pong.settingsLogStreaming.createDestination(DESTINATION_NAMES.FIRST);
				await pong.page.reload();
				await pong.settingsLogStreaming.clickDestinationCard(0);
				await expect(pong.settingsLogStreaming.getDestinationDeleteButton()).toBeVisible();
				await pong.settingsLogStreaming.deleteDestination();
				await expect(pong.settingsLogStreaming.getConfirmationDialog()).toBeVisible();
				await pong.settingsLogStreaming.cancelDialog();
				await pong.settingsLogStreaming.deleteDestination();
				await expect(pong.settingsLogStreaming.getConfirmationDialog()).toBeVisible();
				await pong.settingsLogStreaming.confirmDialog();
			});

			test('should create a Sentry destination and persist its DSN', async ({ pong }) => {
				const dsn = 'https://abc@example.com/1';

				await pong.settingsLogStreaming.openDestinationModalForType(1); // Sentry
				await pong.settingsLogStreaming.setDestinationName('Sentry Destination');
				await pong.settingsLogStreaming.fillDsn(dsn);
				await pong.settingsLogStreaming.saveDestination();

				// Reopen the destination after a reload to prove the DSN was persisted.
				await pong.page.reload();
				await pong.settingsLogStreaming.clickDestinationCard(0);
				expect(await pong.settingsLogStreaming.getDsnValue()).toBe(dsn);

				// The test message returns synchronously from the Sentry SDK; we assert
				// the success state, not real ingest (delivery is fire-and-forget).
				await pong.settingsLogStreaming.sendTestEvent();
				await expect(pong.settingsLogStreaming.getSendTestEventButton()).toHaveAttribute(
					'title',
					'Event sent and returned OK',
				);
			});

			test('should create a destination and delete it via card actions', async ({ pong }) => {
				await pong.settingsLogStreaming.createDestination(DESTINATION_NAMES.SECOND);
				await pong.page.reload();

				await pong.settingsLogStreaming.clickDestinationCardDropdown(0);
				await pong.settingsLogStreaming.clickDropdownMenuItem(0);
				await expect(pong.settingsLogStreaming.getDestinationSaveButton()).not.toBeAttached();
				await pong.settingsLogStreaming.closeModalByClickingOverlay();

				await pong.settingsLogStreaming.clickDestinationCardDropdown(0);
				await pong.settingsLogStreaming.clickDropdownMenuItem(1);
				await expect(pong.settingsLogStreaming.getConfirmationDialog()).toBeVisible();
				await pong.settingsLogStreaming.confirmDialog();
			});
		});
	},
);
