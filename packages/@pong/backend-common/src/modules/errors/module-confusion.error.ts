import { UserError } from 'pong-workflow';

export class ModuleConfusionError extends UserError {
	constructor(moduleNames: string[]) {
		const modules = moduleNames.length > 1 ? 'modules' : 'a module';

		super(
			`Found ${modules} listed in both \`PONG_ENABLED_MODULES\` and \`PONG_DISABLED_MODULES\`: ${moduleNames.join(', ')}. Please review your environment variables, as a module cannot be both enabled and disabled.`,
		);
	}
}
