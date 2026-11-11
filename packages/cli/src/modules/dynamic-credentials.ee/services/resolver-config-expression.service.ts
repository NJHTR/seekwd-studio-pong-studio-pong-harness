import { CredentialResolverConfiguration } from '@pong/decorators';
import { Service } from '@pong/di';
import { getNonWorkflowAdditionalKeys } from 'pong-core';
import type { INode, INodeParameters } from 'pong-workflow';
import { isNodeParameters, Workflow } from 'pong-workflow';

import { NodeTypesProxy } from '@pong/backend-services';
import { getBase } from '@/workflow-execute-additional-data';

/**
 * Service for resolving expressions in credential resolver configurations.
 * Uses global data only (secrets, variables) without runtime execution context.
 */
@Service()
export class ResolverConfigExpressionService {
	constructor(private readonly nodeTypes: NodeTypesProxy) {}

	/**
	 * Resolves expressions in config using global data only (secrets, variables).
	 * Does not use runtime execution context or workflow data.
	 * @throws Error if expression syntax is invalid
	 */
	async resolve(
		config: CredentialResolverConfiguration,
		canUseExternalSecrets = false,
	): Promise<CredentialResolverConfiguration> {
		// If config is not INodeParameters, return as is
		if (!isNodeParameters(config)) {
			return config;
		}

		// Create a minimal workflow with the mock node to leverage the expression resolver
		const workflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		const additionalData = await getBase();
		const additionalKeys = getNonWorkflowAdditionalKeys(additionalData, {
			secretsEnabled: canUseExternalSecrets,
		});

		await workflow.expression.acquireIsolate();
		try {
			return workflow.expression.getComplexParameterValue(
				// Use a mock node (mandatory) to resolve expressions in the config
				{
					id: '1',
					name: 'Mock Node',
				} as INode,
				config,
				'manual',
				additionalKeys,
				undefined,
				undefined,
				config,
			) as INodeParameters;
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}
}
