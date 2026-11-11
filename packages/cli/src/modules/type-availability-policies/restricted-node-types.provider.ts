import { LicenseState } from '@pong/backend-common';
import { LICENSE_FEATURES } from '@pong/constants';
import type { WorkflowIdsQuery } from '@pong/db';
import { Service } from '@pong/di';
import { singleFlight } from '@pong/utils/promise/single-flight';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import type { RestrictedNodeTypesProvider } from '@pong/backend-services';

import { NODE_TYPES_KIND } from './constants';
import type {
	NodeTypesInProjects,
	RestrictedNodeTypes,
} from './database/repositories/restricted-node-type-match';
import { RestrictedWorkflowRepository } from './database/repositories/restricted-workflow.repository';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

const deniedNames = (verdicts: ComposedTypeVerdict[]) =>
	verdicts.filter((verdict) => verdict.action === 'deny').map((verdict) => verdict.name);

@Service()
export class NodeTypePolicyRestrictedTypesProvider implements RestrictedNodeTypesProvider {
	readonly findRestrictedWorkflowIds = singleFlight(async (): Promise<WorkflowIdsQuery | null> => {
		const restricted = await this.findRestrictedNodeTypes();

		return restricted && this.restrictedWorkflowRepository.restrictedWorkflowIdsQuery(restricted);
	});

	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
		private readonly restrictedWorkflowRepository: RestrictedWorkflowRepository,
		private readonly policyEnforcementService: PolicyEnforcementService,
	) {}

	private async findRestrictedNodeTypes(): Promise<RestrictedNodeTypes | null> {
		if (
			!this.licenseState.isLicensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES) ||
			!this.policyEnforcementService.hasChecksFor('workflowStart')
		) {
			return null;
		}

		const inUse = await this.restrictedWorkflowRepository.findRunningNodeTypes();
		if (inUse.length === 0) return null;

		const { withoutProjectPolicy, byProject } =
			await this.service.evaluateComposedTypesForAllProjects(NODE_TYPES_KIND, inUse);

		const shared = deniedNames(withoutProjectPolicy);
		const sharedKey = shared.join('\n');
		const groups = new Map<string, NodeTypesInProjects>();
		for (const { projectId, verdicts } of byProject) {
			const denied = deniedNames(verdicts);
			const key = denied.join('\n');
			if (key === sharedKey) continue;

			const group = groups.get(key) ?? { projectIds: [], nodeTypes: denied };
			group.projectIds.push(projectId);
			groups.set(key, group);
		}
		if (shared.length === 0 && groups.size === 0) return null;

		return { shared, byProjects: [...groups.values()], nodeTypesInUse: inUse };
	}
}
