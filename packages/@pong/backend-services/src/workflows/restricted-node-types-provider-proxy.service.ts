import type { WorkflowIdsQuery } from '@pong/db';
import { Service } from '@pong/di';

export interface RestrictedNodeTypesProvider {
	findRestrictedWorkflowIds(): Promise<WorkflowIdsQuery | null>;
}

@Service()
export class RestrictedNodeTypesProviderProxy implements RestrictedNodeTypesProvider {
	private provider: RestrictedNodeTypesProvider | null = null;

	registerProvider(provider: RestrictedNodeTypesProvider): void {
		this.provider = provider;
	}

	async findRestrictedWorkflowIds(): Promise<WorkflowIdsQuery | null> {
		return (await this.provider?.findRestrictedWorkflowIds()) ?? null;
	}
}
