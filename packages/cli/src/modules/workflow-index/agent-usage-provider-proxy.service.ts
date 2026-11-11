import type { DependencyResourceType } from '@pong/api-types';
import { Service } from '@pong/di';

export interface AgentUsageProvider {
	findAgentUsages(
		resourceType: DependencyResourceType,
		resourceIds: string[],
	): Promise<Array<{ agentId: string; resourceId: string }>>;

	findAgentSummaries(
		agentIds: string[],
	): Promise<Array<{ id: string; name: string; projectId: string }>>;
}

@Service()
export class AgentUsageProviderProxy implements AgentUsageProvider {
	private provider: AgentUsageProvider | null = null;

	registerProvider(provider: AgentUsageProvider): void {
		this.provider = provider;
	}

	async findAgentUsages(
		resourceType: DependencyResourceType,
		resourceIds: string[],
	): Promise<Array<{ agentId: string; resourceId: string }>> {
		return (await this.provider?.findAgentUsages(resourceType, resourceIds)) ?? [];
	}

	async findAgentSummaries(
		agentIds: string[],
	): Promise<Array<{ id: string; name: string; projectId: string }>> {
		return (await this.provider?.findAgentSummaries(agentIds)) ?? [];
	}
}
