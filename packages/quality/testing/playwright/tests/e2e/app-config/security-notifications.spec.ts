import { test, expect } from '../../../fixtures/base';
import type { pongPage } from '../../../pages/pongPage';

test.describe(
	'Security Notifications',
	{
		annotation: [{ type: 'owner', description: 'Cloud Growth' }],
	},
	() => {
		async function setupVersionsApiMock(
			pong: pongPage,
			options: {
				hasSecurityIssue?: boolean;
				hasSecurityFix?: boolean;
				securityIssueFixVersion?: string;
			} = {},
		) {
			const {
				hasSecurityIssue = false,
				hasSecurityFix = false,
				securityIssueFixVersion = '',
			} = options;

			await pong.page.route('**/api/versions/**', async (route) => {
				// Extract current version from URL path
				const url = route.request().url();
				const currentVersion = url.split('/').pop() ?? '1.106.1';

				// Parse version to create next version
				const versionParts = currentVersion.split('.');
				const nextPatchVersion = `${versionParts[0]}.${versionParts[1]}.${parseInt(versionParts[2]) + 1}`;

				const mockVersions = [
					{
						name: currentVersion,
						nodes: [],
						createdAt: '2025-06-24T00:00:00Z',
						description: hasSecurityIssue
							? 'Current version with security issue'
							: 'Current version',
						documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
						hasBreakingChange: false,
						hasSecurityFix: false,
						hasSecurityIssue,
						securityIssueFixVersion:
							securityIssueFixVersion === 'useNextPatch'
								? nextPatchVersion
								: securityIssueFixVersion,
					},
					{
						name: nextPatchVersion,
						nodes: [],
						createdAt: '2025-06-25T00:00:00Z',
						description: hasSecurityFix ? 'Fixed version' : 'Next version',
						documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
						hasBreakingChange: false,
						hasSecurityFix,
						hasSecurityIssue: false,
						securityIssueFixVersion: '',
					},
				];
				await route.fulfill({ json: mockVersions });
			});
		}

		async function setupApiFailure(pong: pongPage) {
			await pong.page.route('**/api/versions/**', async (route) => {
				await route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'API Error' }),
				});
			});
		}

		test.describe('Notifications disabled', () => {
			test.beforeEach(async ({ setupRequirements }) => {
				await setupRequirements({
					config: {
						settings: {
							versionNotifications: {
								enabled: false,
								endpoint: 'https://test.api.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/api/versions/',
								whatsNewEnabled: false,
								whatsNewEndpoint: 'https://test.api.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/api/whats-new',
								infoUrl: 'https://test.docs.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/hosting/installation/updating/',
							},
						},
					},
				});
			});

			test('should not check for versions if feature is disabled', async ({ pong }) => {
				// Track whether any API requests are made to versions endpoint
				let versionsApiCalled = false;

				await pong.page.route('**/api/versions/**', () => {
					versionsApiCalled = true;
				});

				await pong.goHome();

				// Wait a moment for any potential API calls or notifications
				// eslint-disable-next-line playwright/no-networkidle
				await pong.page.waitForLoadState('networkidle');

				// Verify no API request was made to versions endpoint when notifications are disabled
				expect(versionsApiCalled).toBe(false);
			});
		});

		test.describe('Notifications enabled', () => {
			test.beforeEach(async ({ setupRequirements }) => {
				await setupRequirements({
					config: {
						settings: {
							versionNotifications: {
								enabled: true,
								endpoint: 'https://test.api.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/api/versions/',
								whatsNewEnabled: true,
								whatsNewEndpoint: 'https://test.api.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/api/whats-new',
								infoUrl: 'https://test.docs.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/hosting/installation/updating/',
							},
						},
					},
				});
			});

			test('should display security notification with correct messaging and styling', async ({
				pong,
			}) => {
				await setupVersionsApiMock(pong, { hasSecurityIssue: true, hasSecurityFix: true });

				// Reload to trigger version check
				await pong.page.reload();
				await pong.goHome();

				// Verify security notification appears with default message
				const notification = pong.notifications.getNotificationByTitle('Critical update available');
				await expect(notification).toBeVisible();
				await expect(notification).toContainText('Please update to latest version.');
				await expect(notification).toContainText('More info');

				// Verify warning styling
				await expect(pong.notifications.getWarningNotifications()).toBeVisible();

				// Close the notification
				await pong.notifications.closeNotificationByText('Critical update available');

				// Now test with specific fix version
				await setupVersionsApiMock(pong, {
					hasSecurityIssue: true,
					hasSecurityFix: true,
					securityIssueFixVersion: 'useNextPatch',
				});

				// Reload to trigger new version check with fix version
				await pong.goHome();

				// Verify notification shows specific fix version (dynamically generated)
				const notificationWithFixVersion = pong.notifications.getNotificationByTitle(
					'Critical update available',
				);
				await expect(notificationWithFixVersion).toBeVisible();
				await expect(notificationWithFixVersion).toContainText('Please update to version');
				await expect(notificationWithFixVersion).toContainText('or higher.');
			});

			test('should open versions modal when clicking security notification', async ({ pong }) => {
				await setupVersionsApiMock(pong, {
					hasSecurityIssue: true,
					hasSecurityFix: true,
					securityIssueFixVersion: 'useNextPatch',
				});

				await pong.goHome();

				// Wait for and click the security notification
				const notification = pong.notifications.getNotificationByTitle('Critical update available');
				await expect(notification).toBeVisible();
				await notification.click();

				// Verify versions modal opens
				const versionsModal = pong.versions.container;
				await expect(versionsModal).toBeVisible();

				// Verify security update badge exists for the new version
				await expect(pong.versions.getSecurityBadge()).toBeVisible();
			});

			test('should not display security notification when theres no security issue', async ({
				pong,
			}) => {
				await setupVersionsApiMock(pong, { hasSecurityIssue: false });

				await pong.goHome();

				// Verify no security notification appears when no security issue
				const notification = pong.notifications.getNotificationByTitle('Critical update available');
				await expect(notification).toBeHidden();
			});

			test('should handle API failure gracefully', async ({ pong }) => {
				// Enable notifications but mock API failure
				await setupApiFailure(pong);

				await pong.goHome();
				const { projectId } = await pong.projectComposer.createProject();
				await pong.page.goto(`projects/${projectId}/workflows`);

				// Verify no security notification appears on API failure
				const notification = pong.notifications.getNotificationByTitle('Critical update available');
				await expect(notification).toBeHidden();

				// Verify the app still functions normally
				await expect(pong.workflows.getProjectName()).toBeVisible();
			});
		});
	},
);
