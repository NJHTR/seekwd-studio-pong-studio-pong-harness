import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';

// Tags tests must run serially since they share global tag state
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ api }) => {
	await api.tags.deleteAll();
});

test.describe(
	'Workflow tags - Tag creation',
	{
		annotation: [{ type: 'owner', description: 'Context' }],
	},
	() => {
		test('should create and attach tags via the modal, then add more incrementally', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);

			const tag1 = `tag-${nanoid(6)}`;
			const tag2 = `tag-${nanoid(6)}`;
			const tag3 = `tag-${nanoid(6)}`;

			await pong.canvas.clickCreateTagButton();
			await pong.canvas.typeInTagInput(tag1);
			await pong.canvas.pressEnterToCreateTag();

			await pong.canvas.typeInTagInput(tag2);
			await pong.canvas.pressEnterToCreateTag();

			await expect(pong.canvas.getTagPills()).toHaveCount(2);

			await pong.canvas.saveDescriptionAndTagsModal();

			await pong.canvas.clickCreateTagButton();
			await expect(pong.canvas.getTagPills()).toHaveCount(2);

			await pong.canvas.typeInTagInput(tag3);
			await pong.canvas.pressEnterToCreateTag();
			await expect(pong.canvas.getTagPills()).toHaveCount(3);

			await pong.canvas.saveDescriptionAndTagsModal();

			await pong.canvas.clickCreateTagButton();
			await expect(pong.canvas.getTagPills()).toHaveCount(3);
		});

		test('should create tags via modal without attaching them', async ({ pong }) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);

			const tag1 = `modal-${nanoid(6)}`;
			const tag2 = `modal-${nanoid(6)}`;

			await pong.canvas.openTagManagerModal();

			await pong.canvas.tagsManagerModal.addTag();
			await pong.canvas.tagsManagerModal.getTagInputInModal().fill(tag1);
			await pong.canvas.pressEnterToCreateTag();
			await pong.canvas.tagsManagerModal.getTagByName(tag1).waitFor();

			await pong.canvas.tagsManagerModal.addTag();
			await pong.canvas.tagsManagerModal.getTagInputInModal().fill(tag2);
			await pong.canvas.pressEnterToCreateTag();
			await pong.canvas.tagsManagerModal.getTagByName(tag2).waitFor();

			await pong.canvas.tagsManagerModal.clickDoneButton();

			await pong.canvas.openTagsDropdownInModal();

			await expect(pong.canvas.getTagItemInDropdownByName(tag1)).toBeVisible();
			await expect(pong.canvas.getTagItemInDropdownByName(tag2)).toBeVisible();
			await expect(pong.canvas.getTagPills()).toHaveCount(0);

			await pong.canvas.getTagItemInDropdownByName(tag1).click();
			await expect(pong.canvas.getTagPills()).toHaveCount(1);
		});
	},
);

test.describe('Workflow tags - Tag operations', () => {
	test('should delete all tags via modal with confirmation', async ({ pong, api }) => {
		const tags = await Promise.all([
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
			api.tags.create(`del-${nanoid(6)}`),
		]);

		await pong.start.fromBlankCanvas();
		await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);
		await pong.canvas.openTagManagerModal();

		for (let i = 0; i < 5; i++) {
			await pong.canvas.tagsManagerModal.getFirstTagRow().hover();
			await pong.canvas.tagsManagerModal.getDeleteTagButton().first().click();
			await pong.canvas.tagsManagerModal.getDeleteTagConfirmButton().click();
			await expect(pong.canvas.tagsManagerModal.getDeleteConfirmationMessage()).toBeHidden();
		}

		await pong.canvas.tagsManagerModal.clickDoneButton();
		await pong.canvas.openTagsDropdownInModal();

		for (const tag of tags) {
			await expect(pong.canvas.getTagItemInDropdownByName(tag.name)).not.toBeAttached();
		}

		await expect(pong.canvas.getTagPills()).toHaveCount(0);
	});

	test('should detach tag by clicking X in dropdown', async ({ pong, api }) => {
		const tags = await Promise.all([
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
			api.tags.create(`detach-x-${nanoid(6)}`),
		]);

		await pong.start.fromBlankCanvas();
		await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);

		await pong.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await pong.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(pong.canvas.getTagPills()).toHaveCount(5);

		await pong.canvas.saveDescriptionAndTagsModal();

		await pong.canvas.clickCreateTagButton();
		await pong.canvas.getTagCloseButton().first().click();
		await expect(pong.canvas.getTagPills()).toHaveCount(4);

		await pong.canvas.saveDescriptionAndTagsModal();

		await pong.canvas.clickCreateTagButton();
		await expect(pong.canvas.getTagPills()).toHaveCount(4);
	});

	test('should detach tag by clicking selected item in dropdown', async ({ pong, api }) => {
		const tags = await Promise.all([
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
			api.tags.create(`toggle-${nanoid(6)}`),
		]);

		await pong.start.fromBlankCanvas();
		await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);

		await pong.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await pong.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(pong.canvas.getTagPills()).toHaveCount(5);

		await pong.canvas.saveDescriptionAndTagsModal();

		await pong.canvas.clickCreateTagButton();
		await pong.canvas.getSelectedTagItems().first().click();
		await expect(pong.canvas.getTagPills()).toHaveCount(4);

		await pong.canvas.saveDescriptionAndTagsModal();

		await pong.canvas.clickCreateTagButton();
		await expect(pong.canvas.getTagPills()).toHaveCount(4);
	});

	test('should show correct tag count when reopening after save', async ({ pong, api }) => {
		const tags = await Promise.all([
			api.tags.create(`reopen-${nanoid(6)}`),
			api.tags.create(`reopen-${nanoid(6)}`),
			api.tags.create(`reopen-${nanoid(6)}`),
		]);

		await pong.start.fromBlankCanvas();
		await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);

		await pong.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await pong.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(pong.canvas.getTagPills()).toHaveCount(3);

		await pong.canvas.saveDescriptionAndTagsModal();

		await expect(pong.canvas.getWorkflowTagsDropdown()).not.toBeAttached();

		await pong.canvas.openDescriptionAndTagsModal();

		await expect(pong.canvas.getWorkflowTagsDropdown()).toBeVisible();
		await expect(pong.canvas.getTagPills()).toHaveCount(3);
	});

	test('should not show non-existing tag as selectable option', async ({ pong, api }) => {
		const tags = await Promise.all([
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
			api.tags.create(`exist-${nanoid(6)}`),
		]);
		const nonExisting = `nonexist-${nanoid(6)}`;

		await pong.start.fromBlankCanvas();
		await pong.canvas.saveNewWorkflow(`Tags test ${nanoid(6)}`);

		await pong.canvas.clickCreateTagButton();
		for (const tag of tags) {
			await pong.canvas.getTagItemInDropdownByName(tag.name).click();
		}
		await expect(pong.canvas.getTagPills()).toHaveCount(5);

		await pong.canvas.saveDescriptionAndTagsModal();
		await pong.canvas.clickCreateTagButton();
		await pong.canvas.typeInTagInput(nonExisting);

		const dropdownItems = pong.canvas.getTagDropdownItems();

		await expect(dropdownItems).toHaveCount(2);
		await expect(pong.canvas.getTagItemsInDropdown()).toHaveCount(0);
	});
});
