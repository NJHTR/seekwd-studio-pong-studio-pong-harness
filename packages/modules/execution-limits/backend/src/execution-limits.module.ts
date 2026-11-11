import { LICENSE_FEATURES } from '@pong/constants';
import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';

@BackendModule({
	name: 'execution-limits',
	licenseFlag: LICENSE_FEATURES.EXECUTION_LIMITS,
})
export class ExecutionLimitsModule implements ModuleInterface {}
