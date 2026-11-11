import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

export const AiNodePackageJsonRule = createRule({
	name: 'ai-node-package-json',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce consistency between pong.aiNodeSdkVersion and ai-node-sdk peer dependency in community node packages',
		},
		messages: {
			missingPeerDep:
				'Package declares "pong.aiNodeSdkVersion" but is missing "@pong/ai-node-sdk" in peerDependencies. Add "@pong/ai-node-sdk": "*" to peerDependencies.',
			missingSdkVersion:
				'Package has "@pong/ai-node-sdk" in peerDependencies but is missing "aiNodeSdkVersion" in the "pong" section of package.json.',
			invalidSdkVersion: '"pong.aiNodeSdkVersion" must be a positive integer, got {{ value }}.',
			wrongLocation:
				'"aiNodeSdkVersion" must be inside the "pong" section, not at the root level of package.json.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				// Only process the root object, not nested ones
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				const pongProp = findJsonProperty(node, 'pong');
				const pongObject =
					pongProp?.value.type === AST_NODE_TYPES.ObjectExpression ? pongProp.value : null;

				const aiNodeSdkVersionProp = pongObject
					? findJsonProperty(pongObject, 'aiNodeSdkVersion')
					: null;

				const rootAiNodeSdkVersionProp = findJsonProperty(node, 'aiNodeSdkVersion');
				const peerDependenciesProp = findJsonProperty(node, 'peerDependencies');

				const hasAiNodeSdkVersion = aiNodeSdkVersionProp !== null;
				const hasAiNodeSdkPeerDep =
					peerDependenciesProp?.value.type === AST_NODE_TYPES.ObjectExpression &&
					(findJsonProperty(peerDependenciesProp.value, '@pong/ai-node-sdk') !== null ||
						findJsonProperty(peerDependenciesProp.value, 'ai-node-sdk') !== null);

				// Catch aiNodeSdkVersion placed at root level instead of inside pong
				if (rootAiNodeSdkVersionProp) {
					context.report({
						node: rootAiNodeSdkVersionProp,
						messageId: 'wrongLocation',
					});
				}

				// Validate aiNodeSdkVersion is a positive integer when present
				if (hasAiNodeSdkVersion) {
					const valueNode = aiNodeSdkVersionProp.value;
					if (valueNode.type !== AST_NODE_TYPES.Literal || !isPositiveInteger(valueNode.value)) {
						context.report({
							node: aiNodeSdkVersionProp,
							messageId: 'invalidSdkVersion',
							data: {
								value: String(
									valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : 'non-literal',
								),
							},
						});
					}
				}

				// If aiNodeSdkVersion is declared, ai-node-sdk must be in peerDependencies
				if (hasAiNodeSdkVersion && !hasAiNodeSdkPeerDep) {
					context.report({
						node: aiNodeSdkVersionProp,
						messageId: 'missingPeerDep',
					});
				}

				// If ai-node-sdk is in peerDependencies, aiNodeSdkVersion must be declared
				if (hasAiNodeSdkPeerDep && !hasAiNodeSdkVersion) {
					context.report({
						node: peerDependenciesProp,
						messageId: 'missingSdkVersion',
					});
				}
			},
		};
	},
});

function isPositiveInteger(value: unknown): boolean {
	return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
