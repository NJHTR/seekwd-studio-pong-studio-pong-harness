import { Container } from '@pong/di';

import { SystemAgentRegistrationService } from '../system-agent-registration.service';
import { EasycodeAgentProvider, registerEasycodeSystemAgent } from './easycode-agent.provider';

/**
 * Registers the easyCode runtime when `PONG_EASYCODE_RUNTIME=1`.
 *
 * The Agents module calls this once at init. The provider is built through the
 * container, so its repository and supervisor factory follow the normal DI
 * wiring. A disabled flag does no work and leaves the registry empty.
 */
export async function registerEasycodeSystemAgentFromContainer(): Promise<boolean> {
	return await registerEasycodeSystemAgent(
		Container.get(SystemAgentRegistrationService),
		Container.get(EasycodeAgentProvider),
	);
}
