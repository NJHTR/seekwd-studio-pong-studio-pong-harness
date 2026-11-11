import { RuleTester } from '@typescript-eslint/rule-tester';

import { PongObjectValidationRule } from './pong-object-validation.js';

const ruleTester = new RuleTester();

ruleTester.run('pong-object-validation', PongObjectValidationRule, {
	valid: [
		{
			name: 'minimal valid pong object with one node path',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/nodes/Foo/Foo.node.js"] } }',
		},
		{
			name: 'valid pong object with credentials',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/nodes/Foo/Foo.node.js"], "credentials": ["dist/credentials/Foo.credentials.js"] } }',
		},
		{
			name: 'empty credentials array is allowed',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": [] } }',
		},
		{
			name: 'higher integer api version is allowed',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 2, "nodes": ["dist/x.js"] } }',
		},
		{
			name: 'major-only string api version is allowed',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": "3", "nodes": ["dist/x.js"] } }',
		},
		{
			name: 'major.minor string api version is allowed',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": "3.1", "nodes": ["dist/x.js"] } }',
		},
		{
			name: 'two-digit minor string api version is allowed',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": "3.10", "nodes": ["dist/x.js"] } }',
		},
		{
			name: 'non-package.json file is ignored',
			filename: 'some-config.json',
			code: '{ "pong": null }',
		},
		{
			name: 'nested "pong" key inside another field is allowed (only root is validated)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"] }, "config": { "pong": "ignored" } }',
		},
		{
			name: 'objects nested inside arrays are not treated as the package root',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"] }, "contributors": [{ "name": "Jane" }, { "name": "John" }] }',
		},
		{
			name: 'strict is true',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": true } }',
		},
		{
			name: 'strict is false',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": false } }',
		},
		{
			name: 'strict is omitted (optional field)',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"] } }',
		},
	],
	invalid: [
		{
			name: 'missing pong object entirely',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "version": "1.0.0" }',
			errors: [{ messageId: 'missingPongObject' }],
		},
		{
			name: 'pong value is not an object',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": "not-an-object" }',
			errors: [{ messageId: 'missingPongObject' }],
		},
		{
			name: 'missing pongNodesApiVersion',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'missingNodesApiVersion' }],
		},
		{
			name: 'pongNodesApiVersion is a non-numeric string',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": "v3", "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: 'v3' } }],
		},
		{
			name: 'pongNodesApiVersion is a string with a patch part',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": "3.1.0", "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '3.1.0' } }],
		},
		{
			name: 'pongNodesApiVersion is a zero-major string',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": "0.1", "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '0.1' } }],
		},
		{
			name: 'pongNodesApiVersion is zero',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 0, "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '0' } }],
		},
		{
			name: 'pongNodesApiVersion is a float',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1.5, "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion', data: { value: '1.5' } }],
		},
		{
			name: 'pongNodesApiVersion is negative',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": -1, "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'invalidNodesApiVersion' }],
		},
		{
			name: 'pongNodesApiVersion at root level instead of inside pong',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pongNodesApiVersion": 1, "pong": { "nodes": ["dist/x.js"] } }',
			errors: [{ messageId: 'wrongLocationApiVersion' }, { messageId: 'missingNodesApiVersion' }],
		},
		{
			name: 'missing nodes array',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1 } }',
			errors: [{ messageId: 'missingPongNodes' }],
		},
		{
			name: 'nodes is not an array',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": "dist/x.js" } }',
			errors: [{ messageId: 'pongNodesNotArray' }],
		},
		{
			name: 'nodes is empty array',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": [] } }',
			errors: [{ messageId: 'emptyPongNodes' }],
		},
		{
			name: 'node path does not start with dist/',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["nodes/Foo/Foo.node.js"] } }',
			errors: [{ messageId: 'nodePathNotInDist', data: { path: 'nodes/Foo/Foo.node.js' } }],
		},
		{
			name: 'node path uses ./dist/ prefix instead of dist/',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["./dist/x.js"] } }',
			errors: [{ messageId: 'nodePathNotInDist', data: { path: './dist/x.js' } }],
		},
		{
			name: 'node path with wrong casing',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["DIST/x.js"] } }',
			errors: [{ messageId: 'nodePathNotInDist', data: { path: 'DIST/x.js' } }],
		},
		{
			name: 'node path is not a string',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": [123] } }',
			errors: [{ messageId: 'nodePathNotString' }],
		},
		{
			name: 'multiple bad node paths each report',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/ok.js", "bad/one.js", "./dist/two.js"] } }',
			errors: [
				{ messageId: 'nodePathNotInDist', data: { path: 'bad/one.js' } },
				{ messageId: 'nodePathNotInDist', data: { path: './dist/two.js' } },
			],
		},
		{
			name: 'credentials is not an array',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": "dist/c.js" } }',
			errors: [{ messageId: 'pongCredentialsNotArray' }],
		},
		{
			name: 'credential path does not start with dist/',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": ["credentials/Foo.credentials.js"] } }',
			errors: [
				{
					messageId: 'credentialPathNotInDist',
					data: { path: 'credentials/Foo.credentials.js' },
				},
			],
		},
		{
			name: 'credential path is not a string',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "credentials": [true] } }',
			errors: [{ messageId: 'credentialPathNotString' }],
		},
		{
			name: 'strict is a string',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": "true" } }',
			errors: [{ messageId: 'invalidStrict', data: { value: 'true' } }],
		},
		{
			name: 'strict is a number',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": 1 } }',
			errors: [{ messageId: 'invalidStrict', data: { value: '1' } }],
		},
		{
			name: 'strict is null',
			filename: 'package.json',
			code: '{ "name": "pong-nodes-example", "pong": { "pongNodesApiVersion": 1, "nodes": ["dist/x.js"], "strict": null } }',
			errors: [{ messageId: 'invalidStrict', data: { value: 'null' } }],
		},
	],
});
