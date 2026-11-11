import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedSleepDefinitionRule } from './no-restricted-sleep-definition.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-sleep-definition', NoRestrictedSleepDefinitionRule, {
	valid: [
		{ code: 'import { sleep } from "@pong/utils/sleep"' },
		{ code: 'import { sleep } from "pong-workflow"' },
		{ code: 'import { sleep } from "zx"' },
		{ code: 'import { sleep } from "./sleep"' },
		{ code: 'import { retry } from "@pong/utils/retry"' },
		{ code: 'import { something } from "pong-workflow"' },
		{ code: 'function sleep() {}', filename: '/repo/packages/@pong/utils/src/sleep.ts' },
		{
			code: 'const sleepWithAbort = () => {};',
			filename: '/repo/packages/@pong/utils/src/sleep.ts',
		},
		{
			code: 'function sleep(ms: number) {}',
			filename: '/repo/packages/@pong/typeorm/test/utils/test-utils.ts',
		},
		{
			code: 'export async function sleep(ms: number) {}',
			filename: '/repo/packages/@pong/node-cli/src/commands/dev/utils.ts',
		},
	],

	invalid: [
		{
			code: 'function sleep(ms: number) {}',
			errors: [{ messageId: 'noRestrictedSleepDefinition' }],
		},
		{
			code: 'async function sleepWithAbort(ms: number, signal: AbortSignal) {}',
			errors: [{ messageId: 'noRestrictedSleepDefinition' }],
		},
		{
			code: 'const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));',
			errors: [{ messageId: 'noRestrictedSleepDefinition' }],
		},
	],
});
