import { test, expect, instanceAiTestConfig } from './fixtures';
import { hoverToReveal } from '../../../utils/retry-utils';

test.use(instanceAiTestConfig);
test.describe(
	'Instance AI sidebar',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test('should create new thread via sidebar button', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			// Send a message to establish the current thread
			await pong.instanceAi.sendMessage('First thread message');
			await pong.instanceAi.waitForResponseComplete();
			await expect(pong.page).toHaveURL(/\/assistant\/[^/]+$/);
			const firstThreadPath = new URL(pong.page.url()).pathname;

			// Start a new thread from the main navigation, outside the history popover.
			await pong.instanceAi.getNewThreadButton().click();
			await expect(pong.page).toHaveURL(/\/assistant$/);

			// Should show empty input in the new thread
			await expect(pong.instanceAi.getChatInput()).toBeVisible({ timeout: 10_000 });

			// Send a message to materialize the new thread in the sidebar
			await pong.instanceAi.sendMessage('Second thread message');
			await pong.instanceAi.waitForResponseComplete();
			await expect(pong.page).toHaveURL(/\/assistant\/[^/]+$/);
			const secondThreadPath = new URL(pong.page.url()).pathname;
			expect(secondThreadPath).not.toBe(firstThreadPath);

			await pong.instanceAi.openSidebar();

			// Assert specific threads instead of a count, which can include stray rows.
			await expect(pong.instanceAi.sidebar.getThreadByTitle('First thread message')).toBeVisible();
			await expect(pong.instanceAi.sidebar.getThreadByTitle('Second thread message')).toBeVisible();
		});

		test('should switch between threads', async ({ pong }) => {
			await pong.navigate.toInstanceAi();

			// Create first thread with a unique message
			await pong.instanceAi.sendMessage(
				'For this thread switch test, reply with exactly: first thread ready',
			);
			await pong.instanceAi.waitForResponseComplete();
			await expect(pong.page).toHaveURL(/\/assistant\/[^/]+$/);
			const firstThreadId = pong.instanceAi.getCurrentThreadId();
			const firstThreadTitle = `First switch thread ${firstThreadId}`;
			await pong.api.renameInstanceAiThread(firstThreadId, firstThreadTitle);

			// Create second thread
			await pong.instanceAi.getNewThreadButton().click();
			await expect(pong.page).toHaveURL(/\/assistant$/);
			await expect(pong.instanceAi.getChatInput()).toBeVisible({ timeout: 10_000 });

			await pong.instanceAi.sendMessage(
				'For this thread switch test, reply with exactly: second thread ready',
			);
			await pong.instanceAi.waitForResponseComplete();
			const secondThreadId = pong.instanceAi.getCurrentThreadId();
			await pong.instanceAi.gotoThread(secondThreadId);

			await pong.instanceAi.openSidebar();
			const firstThread = pong.instanceAi.sidebar.getThreadByTitle(firstThreadTitle);
			await expect(firstThread).toBeVisible({ timeout: 10_000 });
			await firstThread.click();

			// Should show the first thread's user message (messages load async)
			await expect(pong.instanceAi.getUserMessages().first()).toContainText('first thread ready', {
				timeout: 30_000,
			});
		});

		test('should rename thread via action menu', async ({ pong }) => {
			const thread = await pong.api.createInstanceAiThread();
			await pong.api.renameInstanceAiThread(thread.id, 'Thread to rename');
			await pong.instanceAi.gotoThread(thread.id);

			// Sidebar starts collapsed; open it so the thread list is queryable.
			await pong.instanceAi.openSidebar();

			await pong.instanceAi.sidebar.renameThreadByTitle('Thread to rename', 'Renamed Thread Title');

			// Thread should show the new name
			await expect(pong.instanceAi.sidebar.getThreadByTitle('Renamed Thread Title')).toBeVisible({
				timeout: 5_000,
			});
		});

		test('should delete thread via action menu', async ({ pong }) => {
			const thread = await pong.api.createInstanceAiThread();
			await pong.api.renameInstanceAiThread(thread.id, 'Thread to delete');
			await pong.instanceAi.gotoThread(thread.id);

			// Sidebar starts collapsed; open it so the thread list is queryable.
			await pong.instanceAi.openSidebar();

			const targetThread = pong.instanceAi.sidebar.getThreadByTitle('Thread to delete');
			await expect(targetThread).toBeVisible({ timeout: 10_000 });

			// Hover the target thread to reveal the three-dots button, then click it
			const actionButton = pong.instanceAi.sidebar.getThreadActionsTrigger(targetThread);
			await hoverToReveal(targetThread, actionButton);
			await actionButton.click();

			// Click delete option in the dropdown
			await expect(pong.instanceAi.sidebar.getDeleteMenuItem()).toBeVisible({ timeout: 5_000 });
			await pong.instanceAi.sidebar.getDeleteMenuItem().click();

			// Reopen after navigation so unmounting the popover cannot satisfy this assertion.
			await expect(pong.page).not.toHaveURL(new RegExp(`/assistant/${thread.id}$`));
			await pong.instanceAi.openSidebar();
			await expect(pong.instanceAi.sidebar.getThreadByTitle('Thread to delete')).toBeHidden();
		});
	},
);
