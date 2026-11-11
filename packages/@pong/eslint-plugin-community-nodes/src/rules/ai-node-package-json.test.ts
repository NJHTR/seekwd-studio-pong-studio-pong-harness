import { RuleTester } from '@typescript-eslint/rule-tester';

import { AiNodePackageJsonRule } from './ai-node-package-json.js';

const ruleTester = new RuleTester();

ruleTester.run('ai-node-package-json', AiNodePackageJsonRule, {
	valid: [
		{
			name: 'both pong.aiNodeSdkVersion and ai-node-sdk peer dependency present',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 1 }, "peerDependencies": { "pong-workflow": "*", "ai-node-sdk": "*" } }',
		},
		{
			name: 'both pong.aiNodeSdkVersion and scoped @pong/ai-node-sdk peer dependency present',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 1 }, "peerDependencies": { "pong-workflow": "*", "@pong/ai-node-sdk": "*" } }',
		},
		{
			name: 'neither pong.aiNodeSdkVersion nor ai-node-sdk present (non-AI package)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "version": "1.0.0" }',
		},
		{
			name: 'pong section without aiNodeSdkVersion and no ai-node-sdk peer dep',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "nodes": [] } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "pong": { "aiNodeSdkVersion": 1 } }',
		},
		{
			name: 'peerDependencies without ai-node-sdk and no aiNodeSdkVersion',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "nodes": [] }, "peerDependencies": { "pong-workflow": "*" } }',
		},
		{
			name: 'aiNodeSdkVersion as a larger positive integer with multiple peer deps',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 42 }, "peerDependencies": { "pong-workflow": "^1.0.0", "ai-node-sdk": "^1.0.0" } }',
		},
	],
	invalid: [
		{
			name: 'pong.aiNodeSdkVersion present but ai-node-sdk missing from peerDependencies',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 1 } }',
			errors: [{ messageId: 'missingPeerDep' }],
		},
		{
			name: 'pong.aiNodeSdkVersion present but peerDependencies has other deps only',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 1 }, "peerDependencies": { "pong-workflow": "*" } }',
			errors: [{ messageId: 'missingPeerDep' }],
		},
		{
			name: 'ai-node-sdk in peerDependencies but pong.aiNodeSdkVersion missing',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "nodes": [] }, "peerDependencies": { "pong-workflow": "*", "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'missingSdkVersion' }],
		},
		{
			name: 'ai-node-sdk in peerDependencies but no pong section at all',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'missingSdkVersion' }],
		},
		{
			name: 'pong.aiNodeSdkVersion is a string instead of integer',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": "1" }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: '1' } }],
		},
		{
			name: 'pong.aiNodeSdkVersion is zero',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 0 }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: '0' } }],
		},
		{
			name: 'pong.aiNodeSdkVersion is negative (parsed as UnaryExpression, not Literal)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": -1 }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: 'non-literal' } }],
		},
		{
			name: 'pong.aiNodeSdkVersion is a float',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": 1.5 }, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'invalidSdkVersion', data: { value: '1.5' } }],
		},
		{
			name: 'pong.aiNodeSdkVersion is invalid and ai-node-sdk peer dep is missing (two errors)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "aiNodeSdkVersion": "bad" } }',
			errors: [
				{ messageId: 'invalidSdkVersion', data: { value: 'bad' } },
				{ messageId: 'missingPeerDep' },
			],
		},
		{
			name: 'aiNodeSdkVersion at root level instead of inside pong section',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "aiNodeSdkVersion": 1, "peerDependencies": { "ai-node-sdk": "*" } }',
			errors: [{ messageId: 'wrongLocation' }, { messageId: 'missingSdkVersion' }],
		},
		{
			name: 'aiNodeSdkVersion at root level without peer dep',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "aiNodeSdkVersion": 1 }',
			errors: [{ messageId: 'wrongLocation' }],
		},
	],
});
