import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
});

const vue = (template: string) => `<template>${template}</template>`;

ruleTester.run('require-teleported-tooltip-in-dropdown', RequireTeleportedTooltipInDropdownRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: vue('<PongDropdownMenu><PongTooltip /></PongDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<PongDropdownMenu><PongTooltip teleported /></PongDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<PongDropdownMenu><PongTooltip teleported="" /></PongDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<PongDropdownMenu><PongTooltip teleported="true" /></PongDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<PongDropdownMenu><PongTooltip :teleported="true" /></PongDropdownMenu>'),
		},
		{
			filename: 'Component.vue',
			code: vue('<PongTooltip :teleported="false" />'),
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<pong-dropdown-menu><template #item-label><pong-tooltip /></template></pong-dropdown-menu>',
			),
		},
	],
	invalid: [
		{
			filename: 'Component.vue',
			code: vue('<PongDropdownMenu><PongTooltip :teleported="false" /></PongDropdownMenu>'),
			errors: [{ messageId: 'requireTeleported' }],
		},
		{
			filename: 'Component.vue',
			code: vue(
				'<PongDropdownMenu><template #item-label><PongTooltip :teleported="shouldTeleport" /></template></PongDropdownMenu>',
			),
			errors: [{ messageId: 'requireTeleported' }],
		},
		{
			filename: 'Component.vue',
			code: vue('<pong-dropdown-menu><pong-tooltip :teleported="false" /></pong-dropdown-menu>'),
			errors: [{ messageId: 'requireTeleported' }],
		},
	],
});
