import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedSleepImportRule } from './no-restricted-sleep-import.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-sleep-import', NoRestrictedSleepImportRule, {
	valid: [
		{ code: 'import { sleep } from "@pong/utils/sleep"' },
		{ code: 'import { sleep } from "zx"' },
		{ code: 'import { sleep } from "./sleep"' },
		{ code: 'import { jsonParse } from "pong-workflow"' },
		// Namespace imports say nothing about what they use — the generated
		// `vi.importActual` shape relies on this.
		{ code: 'import type * as _importType0 from "pong-workflow"' },
		{ code: 'import * as pongWorkflow from "pong-workflow"' },
	],

	invalid: [
		{
			code: 'import { sleep } from "pong-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
		{
			code: 'import { sleep as delay } from "pong-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
		{
			code: 'import { jsonParse, sleep } from "pong-workflow"',
			errors: [{ messageId: 'noRestrictedSleepImport' }],
		},
	],
});
