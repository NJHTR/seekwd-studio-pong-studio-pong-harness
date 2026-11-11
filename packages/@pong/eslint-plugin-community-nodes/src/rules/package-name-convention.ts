import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { ReportSuggestionArray } from '@typescript-eslint/utils/ts-eslint';

import { createRule, findJsonProperty } from '../utils/index.js';

export const PackageNameConventionRule = createRule({
	name: 'package-name-convention',
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce correct package naming convention for pong community nodes',
		},
		messages: {
			renameTo: "Rename to '{{suggestedName}}'",
			invalidPackageName:
				'Package name "{{ packageName }}" must follow the convention "pong-nodes-[PACKAGE-NAME]" or "@[AUTHOR]/pong-nodes-[PACKAGE-NAME]"',
			missingName:
				'Package name is missing. Add a "name" field following the convention "pong-nodes-[PACKAGE-NAME]" or "@[AUTHOR]/pong-nodes-[PACKAGE-NAME]"',
			defaultPlaceholderName:
				'Package name "{{ packageName }}" still contains the default placeholder. Replace "<...>" with your package name',
		},
		schema: [],
		hasSuggestions: true,
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (node.parent?.type === AST_NODE_TYPES.Property) {
					return;
				}

				const nameProperty = findJsonProperty(node, 'name');

				if (!nameProperty) {
					context.report({
						node,
						messageId: 'missingName',
					});
					return;
				}

				if (nameProperty.value.type !== AST_NODE_TYPES.Literal) {
					return;
				}

				const packageName = nameProperty.value.value;
				const packageNameStr = typeof packageName === 'string' ? packageName : null;

				if (packageNameStr && isDefaultPlaceholderName(packageNameStr)) {
					context.report({
						node: nameProperty,
						messageId: 'defaultPlaceholderName',
						data: {
							packageName: packageNameStr,
						},
					});
					return;
				}

				if (!packageNameStr || !isValidPackageName(packageNameStr)) {
					const suggestions: ReportSuggestionArray<'invalidPackageName' | 'renameTo'> = [];

					// Generate package name suggestions if we have a valid string
					if (packageNameStr) {
						const suggestedNames = generatePackageNameSuggestions(packageNameStr);
						for (const suggestedName of suggestedNames) {
							suggestions.push({
								messageId: 'renameTo',
								data: { suggestedName },
								fix(fixer) {
									return fixer.replaceText(nameProperty.value, `"${suggestedName}"`);
								},
							});
						}
					}

					context.report({
						node: nameProperty,
						messageId: 'invalidPackageName',
						data: {
							packageName: packageNameStr ?? 'undefined',
						},
						suggest: suggestions,
					});
				}
			},
		};
	},
});

function isDefaultPlaceholderName(name: string): boolean {
	return name.includes('<...>');
}

function isValidPackageName(name: string): boolean {
	const unscoped = /^pong-nodes-.+$/;
	const scoped = /^@.+\/pong-nodes-.+$/;
	return unscoped.test(name) || scoped.test(name);
}

function generatePackageNameSuggestions(invalidName: string): string[] {
	const cleanName = (name: string) => {
		return name
			.replace(/^nodes?-?pong-?/, '')
			.replace(/^pong-/, '')
			.replace(/^nodes?-?/, '')
			.replace(/^node-/, '')
			.replace(/-nodes$/, '');
	};

	if (invalidName.startsWith('@')) {
		const [scope, packagePart] = invalidName.split('/');
		const clean = cleanName(packagePart ?? '');
		return clean ? [`${scope}/pong-nodes-${clean}`] : [];
	}

	const clean = cleanName(invalidName);
	return clean ? [`pong-nodes-${clean}`] : [];
}
