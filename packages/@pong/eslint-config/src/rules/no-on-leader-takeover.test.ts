import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoOnLeaderTakeoverRule } from './no-on-leader-takeover.js';

const ruleTester = new RuleTester();

ruleTester.run('no-on-leader-takeover', NoOnLeaderTakeoverRule, {
	valid: [
		{ code: "import { OnShutdown, OnLeaderStepdown } from '@pong/decorators';" },
		{ code: "import { SystemTask } from '@pong/decorators';" },
		{ code: "import { OnLeaderTakeover } from './my-local-decorators';" },
		{ code: "import * as decorators from './my-local-decorators';" },
	],
	invalid: [
		{
			code: "import { OnLeaderTakeover } from '@pong/decorators';",
			errors: [{ messageId: 'useSystemTask' }],
		},
		{
			code: "import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@pong/decorators';",
			errors: [{ messageId: 'useSystemTask' }],
		},
		{
			code: "import * as decorators from '@pong/decorators';",
			errors: [{ messageId: 'noNamespaceImport' }],
		},
	],
});
