import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'pong-workflow';

import { auditFields, auditOperations } from './AuditDescription';
import { credentialFields, credentialOperations } from './CredentialDescription';
import { executionFields, executionOperations } from './ExecutionDescription';
import { projectFields, projectOperations } from './ProjectDescription';
import { userFields, userOperations } from './UserDescription';
import { workflowFields, workflowOperations } from './WorkflowDescription';
import { searchWorkflows } from './WorkflowLocator';

/**
 * The pong node provides access to the pong API.
 *
 * See: https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness
 */
export class Pong implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'pong',
		name: 'pong',
		icon: 'node:pong',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Handle events and perform actions on your pong instance',
		defaults: {
			name: 'pong',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pongApi',
				required: true,
			},
		],
		requestDefaults: {
			returnFullResponse: true,
			baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Audit',
						value: 'audit',
					},
					{
						name: 'Credential',
						value: 'credential',
					},
					{
						name: 'Execution',
						value: 'execution',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Workflow',
						value: 'workflow',
					},
				],
				default: 'workflow',
			},

			...auditOperations,
			...auditFields,

			...credentialOperations,
			...credentialFields,

			...executionOperations,
			...executionFields,

			...projectOperations,
			...projectFields,

			...userOperations,
			...userFields,

			...workflowOperations,
			...workflowFields,
		],
	};

	methods = {
		listSearch: {
			// Provide workflows search capability for the workflow resourceLocator
			searchWorkflows,
		},
	};
}
