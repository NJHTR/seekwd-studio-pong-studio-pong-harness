import { GlobalConfig } from '@pong/config';
import { BreakingChangeRule } from '@pong/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v2' })
export class TaskRunnerDockerImageRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'task-runner-docker-image-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove task runner from pongio/pong docker image',
			description:
				'Task runners are no longer included in the pongio/pong docker image and must use the separate pongio/runners image',
			category: BreakingChangeCategory.infrastructure,
			impact: 'executionsFail',
			documentationUrl:
				'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		// Not relevant for cloud deployments - cloud manages Docker images
		if (this.globalConfig.deployment.type === 'cloud') {
			return {
				isAffected: false,
				instanceIssues: [],
				recommendations: [],
			};
		}

		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Task runner removed from main Docker image',
					description:
						'The task runner is no longer bundled with the pongio/pong Docker image. If you are using task runners in Docker, you must use the separate pongio/runners image.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Update Docker configuration',
					description:
						'Change the task runner Docker image from pongio/pong to pongio/runners in your docker-compose.yml or Kubernetes configuration',
				},
				{
					action: 'Configure external task runners',
					description:
						'Set up external task runners using the pongio/runners image and configure pong to connect to them using PONG_RUNNERS_MODE=external',
				},
				{
					action: 'Review task runner documentation',
					description:
						'Consult the updated task runner documentation for migration steps and configuration examples',
				},
			],
		};

		return result;
	}
}
