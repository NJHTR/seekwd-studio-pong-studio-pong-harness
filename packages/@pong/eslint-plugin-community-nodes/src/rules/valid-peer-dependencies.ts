import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

const REQUIRED_DEP = 'pong-workflow';
const REQUIRED_VERSION = '*';
// The published SDK is scoped (@pong/ai-node-sdk); the unscoped name is kept for
// backwards compatibility, mirroring no-restricted-imports.
const ALLOWED_DEPS = new Set([REQUIRED_DEP, '@pong/ai-node-sdk', 'ai-node-sdk']);

export const ValidPeerDependenciesRule = createRule({
	name: 'valid-peer-dependencies',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require community node package.json peerDependencies to contain only "pong-workflow": "*" (and optionally "@pong/ai-node-sdk")',
		},
		fixable: 'code',
		messages: {
			missingPeerDependencies: `The package.json must have a "peerDependencies" section containing "${REQUIRED_DEP}": "${REQUIRED_VERSION}".`,
			invalidPeerDependenciesType: `"peerDependencies" must be an object mapping package names to version ranges (containing "${REQUIRED_DEP}": "${REQUIRED_VERSION}").`,
			missingPongWorkflow: `"peerDependencies" must include "${REQUIRED_DEP}": "${REQUIRED_VERSION}".`,
			pinnedPongWorkflow: `"peerDependencies.${REQUIRED_DEP}" must be "${REQUIRED_VERSION}", got {{ value }}.`,
			forbiddenPeerDependency:
				'"{{ name }}" is not allowed in "peerDependencies". Only "pong-workflow" and "@pong/ai-node-sdk" are permitted.',
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
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				const peerDepsProp = findJsonProperty(node, 'peerDependencies');

				if (!peerDepsProp) {
					context.report({
						node,
						messageId: 'missingPeerDependencies',
						fix(fixer) {
							const insertion = `"peerDependencies": { "${REQUIRED_DEP}": "${REQUIRED_VERSION}" }`;
							const lastProp = node.properties[node.properties.length - 1];
							if (!lastProp) {
								return fixer.replaceText(node, `{ ${insertion} }`);
							}
							return fixer.insertTextAfter(lastProp, `, ${insertion}`);
						},
					});
					return;
				}

				if (peerDepsProp.value.type !== AST_NODE_TYPES.ObjectExpression) {
					context.report({
						node: peerDepsProp,
						messageId: 'invalidPeerDependenciesType',
					});
					return;
				}

				const peerDepsObject = peerDepsProp.value;
				const workflowEntry = findJsonProperty(peerDepsObject, REQUIRED_DEP);

				if (!workflowEntry) {
					context.report({
						node: peerDepsProp,
						messageId: 'missingPongWorkflow',
						fix(fixer) {
							const insertion = `"${REQUIRED_DEP}": "${REQUIRED_VERSION}"`;
							const lastProp = peerDepsObject.properties[peerDepsObject.properties.length - 1];
							if (!lastProp) {
								return fixer.replaceText(peerDepsObject, `{ ${insertion} }`);
							}
							return fixer.insertTextAfter(lastProp, `, ${insertion}`);
						},
					});
				} else if (
					workflowEntry.value.type !== AST_NODE_TYPES.Literal ||
					workflowEntry.value.value !== REQUIRED_VERSION
				) {
					const valueNode = workflowEntry.value;
					const rawValue =
						valueNode.type === AST_NODE_TYPES.Literal ? String(valueNode.raw) : 'non-literal';
					context.report({
						node: workflowEntry,
						messageId: 'pinnedPongWorkflow',
						data: { value: rawValue },
						fix(fixer) {
							if (valueNode.type !== AST_NODE_TYPES.Literal) return null;
							return fixer.replaceText(valueNode, `"${REQUIRED_VERSION}"`);
						},
					});
				}

				for (const prop of peerDepsObject.properties) {
					if (prop.type !== AST_NODE_TYPES.Property) continue;
					if (prop.key.type !== AST_NODE_TYPES.Literal) continue;
					const name = prop.key.value;
					if (typeof name !== 'string') continue;
					if (ALLOWED_DEPS.has(name)) continue;
					context.report({
						node: prop,
						messageId: 'forbiddenPeerDependency',
						data: { name },
					});
				}
			},
		};
	},
});
