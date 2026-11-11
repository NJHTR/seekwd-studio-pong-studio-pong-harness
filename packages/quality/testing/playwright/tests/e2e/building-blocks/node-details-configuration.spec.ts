import { test, expect } from '../../../fixtures/base';

test.describe(
	'Node Details Configuration',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test('should configure webhook node', async ({ pong }) => {
			await pong.canvas.addNode('Webhook');

			await pong.ndv.setupHelper.webhook({
				httpMethod: 'POST',
				path: 'test-webhook',
				authentication: 'Basic Auth',
			});

			await expect(pong.ndv.getParameterInputField('path')).toHaveValue('test-webhook');
		});

		test('should configure HTTP Request node', async ({ pong }) => {
			await pong.canvas.addNode('HTTP Request');

			await pong.ndv.setupHelper.httpRequest({
				method: 'POST',
				url: 'https://api.example.com/test',
				sendQuery: true,
				sendHeaders: false,
			});

			await expect(pong.ndv.getParameterInputField('url')).toHaveValue(
				'https://api.example.com/test',
			);
		});

		test('should auto-detect parameter types', async ({ pong }) => {
			await pong.canvas.addNode('Webhook');

			await pong.ndv.setupHelper.setParameter('httpMethod', 'PUT');
			await pong.ndv.setupHelper.setParameter('path', 'auto-detect-test');

			await expect(pong.ndv.getParameterInputField('path')).toHaveValue('auto-detect-test');
		});

		test('should use explicit types for better performance', async ({ pong }) => {
			await pong.canvas.addNode('Webhook');

			await pong.ndv.setupHelper.setParameter('httpMethod', 'PATCH', 'dropdown');
			await pong.ndv.setupHelper.setParameter('path', 'explicit-types', 'text');

			await expect(pong.ndv.getParameterInputField('path')).toHaveValue('explicit-types');
		});

		test('should configure Edit Fields node with single field', async ({ pong }) => {
			await pong.canvas.addNode('Edit Fields (Set)');

			await pong.ndv.editFields.setSingleFieldValue('testField', 'string', 'Hello World');

			const nameInput = pong.ndv.getAssignmentNameTextbox('assignments', 0);
			await expect(nameInput).toHaveValue('testField');
		});

		test('should configure Edit Fields node with multiple fields', async ({ pong }) => {
			await pong.canvas.addNode('Edit Fields (Set)');

			await pong.ndv.editFields.setFieldsValues([
				{ name: 'stringField', type: 'string', value: 'Test String' },
				{ name: 'numberField', type: 'number', value: 123 },
				{ name: 'booleanField', type: 'boolean', value: true },
			]);

			await expect(pong.ndv.getAssignments('assignments')).toHaveCount(3);
		});

		test('should configure Edit Fields node with all field types', async ({ pong }) => {
			await pong.canvas.addNode('Edit Fields (Set)');

			await pong.ndv.editFields.setFieldsValues([
				{ name: 'myString', type: 'string', value: 'Hello' },
				{ name: 'myNumber', type: 'number', value: 42 },
				{ name: 'myBoolean', type: 'boolean', value: false },
				{ name: 'myArray', type: 'array', value: '["item1", "item2"]' },
			]);

			await expect(pong.ndv.getAssignments('assignments')).toHaveCount(4);
		});
	},
);
