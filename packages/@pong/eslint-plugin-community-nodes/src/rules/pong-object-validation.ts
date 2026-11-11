import { parseNodesApiLevel } from '@pong/utils/nodes-api-level';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

type MessageIds =
	| 'missingPongObject'
	| 'wrongLocationApiVersion'
	| 'missingNodesApiVersion'
	| 'invalidNodesApiVersion'
	| 'missingPongNodes'
	| 'pongNodesNotArray'
	| 'emptyPongNodes'
	| 'pongCredentialsNotArray'
	| 'nodePathNotString'
	| 'nodePathNotInDist'
	| 'credentialPathNotString'
	| 'credentialPathNotInDist'
	| 'invalidStrict';

type Context = TSESLint.RuleContext<MessageIds, []>;

export const PongObjectValidationRule = createRule<[], MessageIds>({
	name: 'pong-object-validation',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Validate the structure of the "pong" object in community node package.json (required keys, types, and dist/ paths)',
		},
		messages: {
			missingPongObject:
				'Community node package.json must contain an "pong" object describing the package.',
			wrongLocationApiVersion:
				'"pongNodesApiVersion" must be inside the "pong" section, not at the root level of package.json.',
			missingNodesApiVersion:
				'The "pong" object must declare "pongNodesApiVersion" (a positive integer, or a "<major>" or "<major>.<minor>" string).',
			invalidNodesApiVersion:
				'"pong.pongNodesApiVersion" must be a positive integer, or a "<major>" or "<major>.<minor>" string, got {{ value }}.',
			missingPongNodes: 'The "pong" object must declare "nodes" as an array of "dist/" paths.',
			pongNodesNotArray: '"pong.nodes" must be an array of "dist/" paths.',
			emptyPongNodes: '"pong.nodes" must contain at least one path.',
			pongCredentialsNotArray: '"pong.credentials" must be an array of "dist/" paths.',
			nodePathNotString: 'Each entry in "pong.nodes" must be a string starting with "dist/".',
			nodePathNotInDist:
				'Path "{{ path }}" in "pong.nodes" must start with "dist/" (compiled output).',
			credentialPathNotString:
				'Each entry in "pong.credentials" must be a string starting with "dist/".',
			credentialPathNotInDist:
				'Path "{{ path }}" in "pong.credentials" must start with "dist/" (compiled output).',
			invalidStrict: '"pong.strict" must be a boolean, got {{ value }}.',
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
				const root = getTopLevelObjectInJson(node);
				if (!root) return;

				// Catch pongNodesApiVersion accidentally placed at root level.
				const rootApiVersionProp = findJsonProperty(root, 'pongNodesApiVersion');
				if (rootApiVersionProp) {
					context.report({
						node: rootApiVersionProp,
						messageId: 'wrongLocationApiVersion',
					});
				}

				const pongProp = findJsonProperty(root, 'pong');
				if (!pongProp) {
					context.report({
						node: root,
						messageId: 'missingPongObject',
					});
					return;
				}

				if (pongProp.value.type !== AST_NODE_TYPES.ObjectExpression) {
					context.report({
						node: pongProp,
						messageId: 'missingPongObject',
					});
					return;
				}

				const pongObject = pongProp.value;

				validateApiVersion(context, pongObject);
				validateNodes(context, pongObject);
				validateCredentials(context, pongObject);
				validateStrict(context, pongObject);
			},
		};
	},
});

function validateApiVersion(context: Context, pongObject: TSESTree.ObjectExpression): void {
	const apiVersionProp = findJsonProperty(pongObject, 'pongNodesApiVersion');
	if (!apiVersionProp) {
		context.report({ node: pongObject, messageId: 'missingNodesApiVersion' });
		return;
	}

	const valueNode = apiVersionProp.value;
	if (valueNode.type !== AST_NODE_TYPES.Literal || parseNodesApiLevel(valueNode.value) === null) {
		context.report({
			node: apiVersionProp,
			messageId: 'invalidNodesApiVersion',
			data: {
				value: String(valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : 'non-literal'),
			},
		});
	}
}

function validateStrict(context: Context, pongObject: TSESTree.ObjectExpression): void {
	const strictProp = findJsonProperty(pongObject, 'strict');
	if (!strictProp) return; // optional

	const valueNode = strictProp.value;
	if (valueNode.type !== AST_NODE_TYPES.Literal || typeof valueNode.value !== 'boolean') {
		context.report({
			node: strictProp,
			messageId: 'invalidStrict',
			data: {
				value: String(valueNode.type === AST_NODE_TYPES.Literal ? valueNode.value : 'non-literal'),
			},
		});
	}
}

function validateNodes(context: Context, pongObject: TSESTree.ObjectExpression): void {
	const nodesProp = findJsonProperty(pongObject, 'nodes');
	if (!nodesProp) {
		context.report({ node: pongObject, messageId: 'missingPongNodes' });
		return;
	}

	if (nodesProp.value.type !== AST_NODE_TYPES.ArrayExpression) {
		context.report({ node: nodesProp, messageId: 'pongNodesNotArray' });
		return;
	}

	const elements = nodesProp.value.elements;
	if (elements.length === 0) {
		context.report({ node: nodesProp, messageId: 'emptyPongNodes' });
		return;
	}

	validatePathArray(context, elements, 'nodePathNotString', 'nodePathNotInDist');
}

function validateCredentials(context: Context, pongObject: TSESTree.ObjectExpression): void {
	const credentialsProp = findJsonProperty(pongObject, 'credentials');
	if (!credentialsProp) return; // optional

	if (credentialsProp.value.type !== AST_NODE_TYPES.ArrayExpression) {
		context.report({ node: credentialsProp, messageId: 'pongCredentialsNotArray' });
		return;
	}

	validatePathArray(
		context,
		credentialsProp.value.elements,
		'credentialPathNotString',
		'credentialPathNotInDist',
	);
}

function validatePathArray(
	context: Context,
	elements: TSESTree.ArrayExpression['elements'],
	notStringMessageId: 'nodePathNotString' | 'credentialPathNotString',
	notInDistMessageId: 'nodePathNotInDist' | 'credentialPathNotInDist',
): void {
	for (const element of elements) {
		if (!element) continue;
		if (element.type !== AST_NODE_TYPES.Literal || typeof element.value !== 'string') {
			context.report({ node: element, messageId: notStringMessageId });
			continue;
		}
		if (!element.value.startsWith('dist/')) {
			context.report({
				node: element,
				messageId: notInDistMessageId,
				data: { path: element.value },
			});
		}
	}
}
