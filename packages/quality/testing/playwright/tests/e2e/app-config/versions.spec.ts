import { test, expect } from '../../../fixtures/base';
import type { TestRequirements } from '../../../Types';

const requirements: TestRequirements = {
	config: {
		settings: {
			releaseChannel: 'stable',
			versionCli: '1.0.0',
			versionNotifications: {
				enabled: true,
				endpoint: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
				whatsNewEnabled: true,
				whatsNewEndpoint: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
				infoUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			},
		},
	},
	intercepts: {
		versions: {
			url: '**/api/versions/**',
			response: [
				{
					name: '1.0.0',
					nodes: [],
					createdAt: '2025-06-01T00:00:00Z',
					description: 'Current version',
					documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
				{
					name: '1.0.1',
					nodes: [],
					createdAt: '2025-06-15T00:00:00Z',
					description: 'Version 1.0.1',
					documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
				{
					name: '1.0.2',
					nodes: [],
					createdAt: '2025-06-30T00:00:00Z',
					description: 'Version 1.0.2',
					documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
					hasBreakingChange: false,
					hasSecurityFix: false,
					hasSecurityIssue: false,
					securityIssueFixVersion: '',
				},
			],
		},
	},
};

test.describe(
	'Versions',
	{
		annotation: [{ type: 'owner', description: 'Cloud Growth' }],
	},
	() => {
		test('should show updates in help section', async ({ pong, setupRequirements }) => {
			await setupRequirements(requirements);
			await pong.goHome();
			await pong.sideBar.expand();
			await pong.sideBar.clickHelpMenuItem();
			await expect(pong.sideBar.getVersionUpdateItem()).toContainText('Update (2 versions behind)');
		});
	},
);
