import { BreakingChangeRule } from '@pong/decorators';
import { InstanceSettings } from 'pong-core';

import { NOT_AFFECTED_INSTANCE } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class DockerOnlyDeploymentRule implements IBreakingChangeInstanceRule {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	id: string = 'docker-only-deployment-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Docker becomes the only supported deployment method',
			description:
				'Support for running pong via npm is removed. The new version must be run via the official Docker image.',
			category: BreakingChangeCategory.infrastructure,
			impact: 'upgradeBlocked',
			documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		if (this.instanceSettings.isDocker) {
			return NOT_AFFECTED_INSTANCE;
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Instance is not running in a container',
					description:
						'This instance appears to run outside a container (e.g. installed via npm). The new version can only be run via the official Docker image.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Migrate to a Docker-based deployment',
					description:
						'Move this instance to the official Docker image before updating, reusing your existing database and encryption key.',
				},
			],
		};
	}
}
