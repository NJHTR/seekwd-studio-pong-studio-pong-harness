import { BreakingChangeRule } from '@pong/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v2' })
export class TunnelOptionRule implements IBreakingChangeInstanceRule {
	id: string = 'tunnel-option-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove pong --tunnel option',
			description: 'The --tunnel CLI option has been removed and will be ignored',
			category: BreakingChangeCategory.instance,
			impact: 'capabilityRemoved',
			documentationUrl: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: true,
			instanceIssues: [
				{
					title: '--tunnel option removed',
					description:
						'The --tunnel CLI option is no longer available. If you were using this feature, calls with the --tunnel flag will ignore the flag and not run the tunnel system.',
					level: 'info',
				},
			],
			recommendations: [],
		};

		return result;
	}
}
