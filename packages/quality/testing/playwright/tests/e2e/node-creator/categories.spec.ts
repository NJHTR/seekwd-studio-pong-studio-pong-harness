import { MANUAL_TRIGGER_NODE_DISPLAY_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

test.skip(
	'Node Creator Categories',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should have "Actions" section collapsed when opening actions view from Trigger root view', async ({
			pong,
		}) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('ActiveCampaign');
			await pong.canvas.nodeCreator.selectItem('ActiveCampaign');

			await expect(pong.canvas.nodeCreator.getCategoryItem('Actions')).toBeVisible();
			await expect(pong.canvas.nodeCreator.getCategoryItem('Triggers')).toBeVisible();

			await pong.canvas.nodeCreator.expectCategoryCollapsed('Triggers', false);

			await pong.canvas.nodeCreator.expectCategoryCollapsed('Actions', true);

			await pong.canvas.nodeCreator.selectCategoryItem('Actions');
			await pong.canvas.nodeCreator.expectCategoryCollapsed('Actions', false);
		});

		test('should have "Triggers" section collapsed when opening actions view from Regular root view', async ({
			pong,
		}) => {
			await pong.canvas.addNode('Manual Trigger');

			await pong.canvas.clickNodePlusEndpoint(MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			await pong.canvas.nodeCreator.searchFor('pong');
			await pong.canvas.nodeCreator.getNodeItems().filter({ hasText: 'pong' }).first().click();

			await pong.canvas.nodeCreator.expectCategoryCollapsed('Actions', false);

			await pong.canvas.nodeCreator.selectCategoryItem('Actions');
			await pong.canvas.nodeCreator.expectCategoryCollapsed('Actions', true);

			await pong.canvas.nodeCreator.expectCategoryCollapsed('Triggers', true);

			await pong.canvas.nodeCreator.selectCategoryItem('Triggers');
			await pong.canvas.nodeCreator.expectCategoryCollapsed('Triggers', false);
		});

		test('should show callout and two suggested nodes if node has no trigger actions', async ({
			pong,
		}) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('Customer Datastore (pong training)');
			await pong.canvas.nodeCreator.selectItem('Customer Datastore (pong training)');

			await expect(pong.canvas.nodeCreator.getNoTriggersCallout()).toBeVisible();
			await expect(pong.canvas.nodeCreator.getItem('On a Schedule')).toBeVisible();
			await expect(pong.canvas.nodeCreator.getItem('On a Webhook call')).toBeVisible();
		});

		test('should show intro callout if user has not made a production execution', async ({
			pong,
		}) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('Customer Datastore (pong training)');
			await pong.canvas.nodeCreator.selectItem('Customer Datastore (pong training)');
			await pong.page.pause();
			await expect(pong.canvas.nodeCreator.getActivationCallout()).toBeVisible();
		});

		test('should show Trigger and Actions sections during search', async ({ pong }) => {
			await pong.canvas.nodeCreator.open();
			await pong.canvas.nodeCreator.searchFor('Customer Datastore (pong training)');
			await pong.canvas.nodeCreator.selectItem('Customer Datastore (pong training)');

			await pong.canvas.nodeCreator.searchFor('Non existent action name');

			await expect(pong.canvas.nodeCreator.getCategoryItem('Triggers')).toBeVisible();
			await expect(pong.canvas.nodeCreator.getCategoryItem('Actions')).toBeVisible();
			await expect(pong.canvas.nodeCreator.getNoTriggersCallout()).toBeVisible();
			await expect(pong.canvas.nodeCreator.getItem('On a Schedule')).toBeVisible();
			await expect(pong.canvas.nodeCreator.getItem('On a Webhook call')).toBeVisible();
		});
	},
);
