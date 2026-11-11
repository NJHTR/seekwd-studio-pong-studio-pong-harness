import { expect, test } from '../../../../fixtures/base';
import type { pongPage } from '../../../../pages/pongPage';
import {
	buildRepoUrl,
	generateUniqueRepoName,
	initSourceControl,
} from '../../../../utils/source-control-helper';

test.use({ capability: 'source-control' });

async function saveSettings(pong: pongPage) {
	await Promise.all([
		pong.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/preferences') &&
				response.request().method() === 'PATCH',
		),
		pong.settingsEnvironment.getSaveButton().click(),
	]);
}

async function connectRepository(pong: pongPage) {
	await expect(pong.settingsEnvironment.getConnectButton()).toBeEnabled();
	await Promise.all([
		pong.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/preferences') &&
				response.request().method() === 'POST',
		),
		pong.settingsEnvironment.getConnectButton().click(),
	]);
}

async function disconnectRepository(pong: pongPage) {
	await Promise.all([
		pong.page.waitForResponse(
			(response) =>
				response.url().includes('/rest/source-control/disconnect') &&
				response.request().method() === 'POST',
		),
		pong.settingsEnvironment.disconnect(),
	]);
}

// Exercises global source-control preferences, so keep the cases serialized.
// https://linear.app/pong/issue/PAY-4365/bug-source-control-operations-fail-in-multi-main-deployment
test.describe(
	'Source Control Settings @licensed',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.describe.configure({ mode: 'serial' });

		let repoUrl: string;
		let repoName: string;

		test.beforeEach(async ({ pong, api, services }) => {
			await api.enableFeature('sourceControl');
			const gitea = services.gitea;
			await initSourceControl({ pong, api, gitea });

			// Create unique repo with branches via API (not UI)
			repoName = generateUniqueRepoName();
			await gitea.createRepo(repoName);

			repoUrl = buildRepoUrl(repoName);
		});

		test('should connect to Git repository using SSH', async ({ pong }) => {
			// Test UI connection flow with unique repo
			await pong.navigate.toEnvironments();

			await pong.settingsEnvironment.waitForConnectForm();
			await pong.settingsEnvironment.fillRepoUrl(repoUrl);
			await connectRepository(pong);

			await expect(pong.settingsEnvironment.getDisconnectButton()).toBeVisible();
			await expect(pong.settingsEnvironment.getBranchSelect()).toBeVisible();

			await pong.settingsEnvironment.getBranchSelect().click();
			await expect(pong.settingsEnvironment.getVisiblePopoverOption('main')).toBeVisible();

			// Verify source control connected indicator is visible
			await pong.navigate.toHome();
			await expect(pong.sideBar.getSourceControlConnectedIndicator()).toBeVisible();
		});

		test('should switch between branches', async ({ pong, api, services }) => {
			const gitea = services.gitea;
			await gitea.createBranch(repoName, 'development');
			await gitea.createBranch(repoName, 'staging');
			await gitea.createBranch(repoName, 'production');

			await api.sourceControl.connect({ repositoryUrl: repoUrl });

			await pong.navigate.toEnvironments();

			// Switch to 'development' branch
			await pong.settingsEnvironment.getBranchSelect().click();
			await expect(pong.settingsEnvironment.getVisiblePopoverOption('main')).toBeVisible();
			await expect(pong.settingsEnvironment.getVisiblePopoverOption('development')).toBeVisible();
			await expect(pong.settingsEnvironment.getVisiblePopoverOption('staging')).toBeVisible();
			await expect(pong.settingsEnvironment.getVisiblePopoverOption('production')).toBeVisible();
			await pong.settingsEnvironment.getVisiblePopoverOption('development').click();
			await saveSettings(pong);

			// Verify branch switched by checking preferences
			let preferences = await api.sourceControl.getPreferences();
			expect(preferences.branchName).toBe('development');

			// Switch back to 'main'
			await pong.settingsEnvironment.selectBranch('main');
			await saveSettings(pong);

			// Verify switched back
			preferences = await api.sourceControl.getPreferences();
			expect(preferences.branchName).toBe('main');
		});

		test('should enable read-only mode and restrict operations', async ({ pong, api }) => {
			await api.sourceControl.connect({ repositoryUrl: repoUrl });

			await pong.navigate.toEnvironments();

			await pong.settingsEnvironment.enableReadOnlyMode();
			await saveSettings(pong);

			// Verify push button is disabled in read-only mode
			await pong.navigate.toHome();
			await expect(pong.sideBar.getSourceControlPushButton()).toBeDisabled();
			await expect(pong.sideBar.getSourceControlPullButton()).toBeEnabled();

			await pong.navigate.toEnvironments();
			await pong.settingsEnvironment.disableReadOnlyMode();
			await saveSettings(pong);

			// Verify push button is enabled again
			await pong.navigate.toHome();
			await expect(pong.sideBar.getSourceControlPushButton()).toBeEnabled();
			await expect(pong.sideBar.getSourceControlPullButton()).toBeEnabled();
		});

		test('should disconnect and reconnect with existing keys', async ({ pong, api }) => {
			await api.sourceControl.connect({ repositoryUrl: repoUrl });

			await pong.navigate.toEnvironments();
			await disconnectRepository(pong);

			// check that source control is disconnected
			await pong.navigate.toHome();
			await expect(pong.sideBar.getSourceControlConnectedIndicator()).toBeHidden();

			// Reconnect
			await pong.navigate.toEnvironments();
			await pong.settingsEnvironment.waitForConnectForm();
			await pong.settingsEnvironment.fillRepoUrl(repoUrl);
			await connectRepository(pong);

			await expect(pong.settingsEnvironment.getDisconnectButton()).toBeVisible();
			await expect(pong.settingsEnvironment.getBranchSelect()).toBeVisible();

			// check that source control is connected
			await pong.navigate.toHome();
			await expect(pong.sideBar.getSourceControlConnectedIndicator()).toBeVisible();
		});
	},
);
