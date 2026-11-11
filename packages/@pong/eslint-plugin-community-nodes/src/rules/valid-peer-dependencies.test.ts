import { RuleTester } from '@typescript-eslint/rule-tester';

import { ValidPeerDependenciesRule } from './valid-peer-dependencies.js';

const ruleTester = new RuleTester();

ruleTester.run('valid-peer-dependencies', ValidPeerDependenciesRule, {
	valid: [
		{
			name: 'only pong-workflow with "*"',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*" } }',
		},
		{
			name: 'pong-workflow and scoped @pong/ai-node-sdk',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "@pong/ai-node-sdk": "*" } }',
		},
		{
			name: 'pong-workflow and ai-node-sdk',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "ai-node-sdk": "*" } }',
		},
		{
			name: 'pong-workflow and ai-node-sdk with a version range (ai-node-sdk shape is checked by ai-node-package-json rule)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "ai-node-sdk": "^1.0.0" } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "peerDependencies": { "pong-core": "*" } }',
		},
		{
			name: 'nested objects are not checked',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*" }, "config": { "peerDependencies": { "pong-core": "*" } } }',
		},
	],
	invalid: [
		{
			name: 'missing peerDependencies section entirely',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "version": "1.0.0" }',
			output:
				'{ "name": "pong-nodes-example", "version": "1.0.0", "peerDependencies": { "pong-workflow": "*" } }',
			errors: [{ messageId: 'missingPeerDependencies' }],
		},
		{
			name: 'empty peerDependencies section',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": {} }',
			output: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*" } }',
			errors: [{ messageId: 'missingPongWorkflow' }],
		},
		{
			name: 'peerDependencies missing pong-workflow but has ai-node-sdk',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "ai-node-sdk": "*" } }',
			output:
				'{ "name": "pong-nodes-example", "peerDependencies": { "ai-node-sdk": "*", "pong-workflow": "*" } }',
			errors: [{ messageId: 'missingPongWorkflow' }],
		},
		{
			name: 'pong-workflow pinned to a specific version',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "^1.0.0" } }',
			output: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*" } }',
			errors: [{ messageId: 'pinnedPongWorkflow', data: { value: '"^1.0.0"' } }],
		},
		{
			name: 'forbidden pong-core peer dependency (CNOC-404 Sinch)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "pong-core": "*" } }',
			errors: [{ messageId: 'forbiddenPeerDependency', data: { name: 'pong-core' } }],
		},
		{
			name: 'forbidden arbitrary peer dependency',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "lodash": "^4.0.0" } }',
			errors: [{ messageId: 'forbiddenPeerDependency', data: { name: 'lodash' } }],
		},
		{
			name: 'multiple forbidden peer dependencies reported separately',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "pong-core": "*", "axios": "^1.0.0" } }',
			errors: [
				{ messageId: 'forbiddenPeerDependency', data: { name: 'pong-core' } },
				{ messageId: 'forbiddenPeerDependency', data: { name: 'axios' } },
			],
		},
		{
			name: 'completely empty package.json gets peerDependencies inserted',
			filename: 'package.json',
			code: '{}',
			output: '{ "peerDependencies": { "pong-workflow": "*" } }',
			errors: [{ messageId: 'missingPeerDependencies' }],
		},
		{
			name: 'pong-workflow value is a non-literal (object) — not auto-fixable',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": { "version": "*" } } }',
			errors: [{ messageId: 'pinnedPongWorkflow', data: { value: 'non-literal' } }],
		},
		{
			name: 'peerDependencies is a string instead of an object',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": "pong-workflow" }',
			errors: [{ messageId: 'invalidPeerDependenciesType' }],
		},
		{
			name: 'peerDependencies is an array instead of an object',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": ["pong-workflow"] }',
			errors: [{ messageId: 'invalidPeerDependenciesType' }],
		},
		{
			name: 'peerDependencies is null',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": null }',
			errors: [{ messageId: 'invalidPeerDependenciesType' }],
		},
		{
			name: 'pinned pong-workflow combined with forbidden entry',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "1.0.0", "pong-core": "*" } }',
			output:
				'{ "name": "pong-nodes-example", "peerDependencies": { "pong-workflow": "*", "pong-core": "*" } }',
			errors: [
				{ messageId: 'pinnedPongWorkflow', data: { value: '"1.0.0"' } },
				{ messageId: 'forbiddenPeerDependency', data: { name: 'pong-core' } },
			],
		},
	],
});
