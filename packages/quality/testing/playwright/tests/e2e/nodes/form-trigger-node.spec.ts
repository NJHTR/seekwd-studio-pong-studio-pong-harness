import type { INodeParameters, IWorkflowBase } from 'pong-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';

test.describe(
	'Form Trigger',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.start.fromBlankCanvas();
		});

		test("add node by clicking on 'On form submission'", async ({ pong }) => {
			await pong.canvas.clickNodeCreatorPlusButton();
			await pong.canvas.nodeCreatorItemByName('On form submission').click();

			await pong.ndv.fillParameterInput('Form Title', 'Test Form');
			await pong.ndv.fillParameterInput('Form Description', 'Test Form Description');
			await pong.ndv.clickBackToCanvasButton();

			await expect(pong.canvas.nodeByName('On form submission')).toBeVisible();
			await expect(pong.canvas.nodeIssuesBadge('On form submission')).toBeHidden();
		});

		test('should fill up form fields', async ({ pong }) => {
			await pong.canvas.clickNodeCreatorPlusButton();
			await pong.canvas.nodeCreatorItemByName('On form submission').click();

			await pong.ndv.fillParameterInput('Form Title', 'Test Form');
			await pong.ndv.fillParameterInput('Form Description', 'Test Form Description');

			// Add first field - Number type with required flag
			await pong.ndv.addFixedCollectionItem();
			await pong.ndv.fillParameterInputByName('fieldLabel', 'Test Field 1');
			await pong.ndv.selectOptionInParameterDropdown('fieldType', 'Number');
			await pong.ndv.addFixedCollectionProperty('Custom Field Name', 0);
			await pong.ndv.fillParameterInputByName('fieldName', 'testField1');
			await pong.ndv.addFixedCollectionProperty('Required Field', 0);
			await pong.ndv.setParameterSwitch('requiredField', true);

			// Add second field - Text type
			await pong.ndv.addFixedCollectionItem();
			await pong.ndv.fillParameterInputByName('fieldLabel', 'Test Field 2', 1);
			await pong.ndv.addFixedCollectionProperty('Custom Field Name', 1);
			await pong.ndv.fillParameterInputByName('fieldName', 'testField2', 1);

			// Add third field - Date type
			await pong.ndv.addFixedCollectionItem();
			await pong.ndv.fillParameterInputByName('fieldLabel', 'Test Field 3', 2);
			await pong.ndv.selectOptionInParameterDropdown('fieldType', 'Date', 2);
			await pong.ndv.addFixedCollectionProperty('Custom Field Name', 2);
			await pong.ndv.fillParameterInputByName('fieldName', 'testField3', 2);

			// Add fourth field - Dropdown type with options
			await pong.ndv.addFixedCollectionItem();
			await pong.ndv.fillParameterInputByName('fieldLabel', 'Test Field 4', 3);
			await pong.ndv.selectOptionInParameterDropdown('fieldType', 'Dropdown', 3);
			await pong.ndv.addFixedCollectionProperty('Custom Field Name', 3);
			await pong.ndv.fillParameterInputByName('fieldName', 'testField4', 3);

			// Configure dropdown field options
			await pong.ndv.clickNodeParameterButton('Add Field Option');
			await pong.ndv.fillParameterInputByName('option', 'Option 1');
			await pong.ndv.fillParameterInputByName('option', 'Option 2', 1);

			// Add optional submitted message
			await pong.ndv.addParameterOptionByName('Form Response');
			await pong.ndv.fillParameterInput('Text to Show', 'Your test form was successfully submitted');

			await pong.ndv.clickBackToCanvasButton();
			await expect(pong.canvas.nodeByName('On form submission')).toBeVisible();
			await expect(pong.canvas.nodeIssuesBadge('On form submission')).toBeHidden();
		});

		// NODE-5915: Textarea placeholders and entered text must use a sans-serif font.
		test('should use sans-serif for textarea placeholders and entered text', async ({
			api,
			pong,
			backendUrl,
		}) => {
			const webhookId = nanoid();
			const workflow: Partial<IWorkflowBase> = {
				name: `Form textarea font ${nanoid()}`,
				nodes: [
					{
						id: nanoid(),
						name: 'On form submission',
						type: 'pong-nodes-base.formTrigger',
						typeVersion: 2.5,
						position: [0, 0],
						webhookId,
						parameters: {
							formTitle: 'Contact us',
							formFields: {
								values: [
									{
										fieldLabel: 'Message',
										fieldType: 'textarea',
										placeholder: 'Enter your message',
									},
								],
							},
							options: {},
						},
					},
				],
				connections: {},
			};
			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				workflow,
				{ makeUnique: false },
			);

			try {
				await api.workflows.activate(workflowId, createdWorkflow.versionId!);
				await expect
					.poll(async () => await api.workflows.getPublicationStatus(workflowId), {
						timeout: 15_000,
					})
					.toMatchObject({ status: 'published', liveVersionId: createdWorkflow.versionId });
				const formPage = await PublicFormPage.fromNewTab(
					pong.page.context(),
					`${backendUrl}/form/${webhookId}`,
				);
				try {
					await expect(formPage.submitButton).toHaveCSS('font-family', /sans-serif/);
					const textarea = formPage.getField('Message');
					await expect(textarea).toBeVisible();
					await expect(textarea).toHaveValue('');
					await expect(textarea).toHaveAttribute('placeholder', 'Enter your message');
					const placeholderFont = await textarea.evaluate(
						(element) => getComputedStyle(element, '::placeholder').fontFamily,
					);
					expect.soft(placeholderFont, 'Textarea placeholder font').toMatch(/sans-serif/);

					await formPage.fillField('Message', 'Please send more information.');
					await expect(textarea).toHaveValue('Please send more information.');
					await expect.soft(textarea).toHaveCSS('font-family', /sans-serif/);
				} finally {
					await formPage.close();
				}
			} finally {
				await api.workflows.deactivate(workflowId);
				await expect
					.poll(async () => (await api.workflows.getPublicationStatus(workflowId)).status, {
						timeout: 15_000,
					})
					.toBe('not_published');
				await api.workflows.archive(workflowId);
				await api.workflows.delete(workflowId);
			}
		});

		test('should create and submit a multi-page form', async ({ pong }) => {
			// Add Form Trigger node with first name field
			await pong.canvas.clickNodeCreatorPlusButton();
			await pong.canvas.nodeCreatorItemByName('On form submission').click();

			await pong.ndv.fillParameterInput('Form Title', 'Multi-Page Form');
			await pong.ndv.fillParameterInput('Form Description', 'A form with multiple pages');

			// Add a single field to the Form Trigger node
			await pong.ndv.addFixedCollectionItem();
			await pong.ndv.fillParameterInputByName('fieldLabel', 'What is your first name?');

			await pong.ndv.clickBackToCanvasButton();

			// Add Form node (next page) by selecting the "Next Form Page" action
			await pong.canvas.addNode('pong Form', { closeNDV: false, action: 'Next Form Page' });

			// Add a single field to the Form node
			await pong.ndv.addFixedCollectionItem();
			await pong.ndv.fillParameterInputByName('fieldLabel', 'What is your last name?');

			await pong.ndv.clickBackToCanvasButton();

			// Start the workflow execution so it's waiting for form submissions
			// This allows the multi-page form flow to work (continuing to Form node after trigger)
			await pong.canvas.clickExecuteWorkflowButton();
			await expect(pong.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

			// Get the form test URL from the NDV
			await pong.canvas.openNode('On form submission');
			const formUrl = await pong.canvas.getTestFormUrl();

			// Open form URL in a new browser tab
			const formPage = await PublicFormPage.fromNewTab(pong.page.context(), formUrl);

			// Fill first page with a random first name
			const firstName = `John${Date.now()}`;
			await formPage.fillField('What is your first name?', firstName);
			await formPage.submit();

			// Fill second page with a random last name
			const lastName = `Doe${Date.now()}`;
			await formPage.fillField('What is your last name?', lastName);
			await formPage.submit();

			// Verify the form was submitted successfully
			await formPage.expectText('Your response has been recorded');

			// Close the form page
			await formPage.close();
		});

		test.describe('form execution with basic auth', () => {
			const password = new Date().toDateString();

			test.use({
				httpCredentials: {
					username: 'test',
					password,
				},
			});

			test('form submission works with basic auth', async ({ api, pong }) => {
				const { id, name } = await api.credentials.createCredential({
					name: 'Basic Auth test:test',
					type: 'httpBasicAuth',
					data: {
						user: 'test',
						password,
					},
				});

				const workflow: Partial<IWorkflowBase> = {
					nodes: [
						{
							parameters: {
								authentication: 'basicAuth',
								formTitle: 'Test',
								options: {
									respondWithOptions: {
										values: {
											formSubmittedText: 'This worked',
										},
									},
								},
							},
							type: 'pong-nodes-base.formTrigger',
							typeVersion: 2.5,
							position: [0, 0],
							id: '49b31a69-3fc9-43d0-944e-990783330e7a',
							name: 'On form submission',
							webhookId: '17eae80c-039e-4779-be68-08cd5afc5f65',
							credentials: {
								httpBasicAuth: {
									id,
									name,
								},
							},
						},
					],
					connections: {},
					pinData: {},
					meta: {
						instanceId: 'acd7615bcc3af421bbd7517e305cc16505176a6a47045dbe39e25d904c940573',
					},
				};

				const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
					makeUnique: true,
				});

				await pong.start.fromExistingWorkflow(workflowId);

				// Start the workflow execution so it's waiting for form submissions
				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				// Get the form test URL from the NDV
				await pong.canvas.openNode('On form submission');
				const formUrl = await pong.canvas.getTestFormUrl();

				// Open form URL in a new browser tab
				const formPage = await PublicFormPage.fromNewTab(pong.page.context(), formUrl);

				// Submit the form
				await formPage.submit();
				await formPage.expectText('This worked');
			});

			test('multi-step form submission works with basic auth', async ({ api, pong }) => {
				const { id, name } = await api.credentials.createCredential({
					name: 'Basic Auth test:test',
					type: 'httpBasicAuth',
					data: {
						user: 'test',
						password,
					},
				});

				const workflow: Partial<IWorkflowBase> = {
					nodes: [
						{
							parameters: {
								authentication: 'basicAuth',
								formTitle: 'Test',
							},
							type: 'pong-nodes-base.formTrigger',
							typeVersion: 2.5,
							position: [0, 0],
							id: '49b31a69-3fc9-43d0-944e-990783330e7a',
							name: 'On form submission',
							webhookId: '17eae80c-039e-4779-be68-08cd5afc5f64',
							credentials: {
								httpBasicAuth: {
									id,
									name,
								},
							},
						},
						{
							parameters: {
								options: {
									formDescription: 'Step 2',
								},
							},
							type: 'pong-nodes-base.form',
							typeVersion: 2.5,
							position: [208, 0],
							id: 'e748b959-faeb-4476-aa30-1c7a6434843a',
							name: 'Form',
							webhookId: '1e1a6d32-d3a4-4150-886b-2119cc4072bc',
						},
						{
							parameters: {
								operation: 'completion',
								completionTitle: 'Success',
								completionMessage: 'This worked',
								options: {},
							},
							type: 'pong-nodes-base.form',
							typeVersion: 2.5,
							position: [416, 0],
							id: '2e52c834-e08a-4848-bd86-be1f7909a956',
							name: 'Form1',
							webhookId: '1839391a-f07d-4bee-858f-678c1b45252b',
						},
					],
					connections: {
						'On form submission': {
							main: [
								[
									{
										node: 'Form',
										type: 'main',
										index: 0,
									},
								],
							],
						},
						Form: {
							main: [
								[
									{
										node: 'Form1',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
					pinData: {},
					meta: {
						templateCredsSetupCompleted: true,
						instanceId: 'acd7615bcc3af421bbd7517e305cc16505176a6a47045dbe39e25d904c940573',
					},
				};

				const { workflowId } = await api.workflows.createWorkflowFromDefinition(workflow, {
					makeUnique: true,
				});

				await pong.start.fromExistingWorkflow(workflowId);

				// Start the workflow execution so it's waiting for form submissions
				await pong.canvas.clickExecuteWorkflowButton();
				await expect(pong.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

				// Get the form test URL from the NDV
				await pong.canvas.openNode('On form submission');
				const formUrl = await pong.canvas.getTestFormUrl();

				// Open form URL in a new browser tab
				const formPage = await PublicFormPage.fromNewTab(pong.page.context(), formUrl);

				// Submit first page
				await formPage.submit();
				await formPage.expectText('Step 2');

				// submit second page
				await formPage.submit();
				await formPage.expectText('This worked');
			});
		});
	},
);

test.describe(
	'Form Trigger test popup',
	{
		annotation: [{ type: 'owner', description: 'NODES' }],
	},
	() => {
		const formTriggerVersions = [
			{
				typeVersion: 1,
				parameters: (path: string): INodeParameters => ({ path }),
				testPath: (path: string) => `/webhook-test/${path}/pong-form`,
			},
			{
				typeVersion: 2,
				parameters: (path: string): INodeParameters => ({ path: `={{ "${path}" }}` }),
				testPath: (path: string) => `/form-test/${path}`,
			},
			{
				typeVersion: 2.1,
				parameters: (path: string): INodeParameters => ({ path: `={{ "${path}" }}` }),
				testPath: (path: string) => `/form-test/${path}`,
			},
			{
				typeVersion: 2.6,
				parameters: (path: string): INodeParameters => ({ options: { path } }),
				testPath: (path: string) => `/form-test/${path}`,
			},
		];

		for (const { typeVersion, parameters, testPath } of formTriggerVersions) {
			test(`should open the served test form for a v${typeVersion} Form Trigger`, async ({
				pong,
			}) => {
				const path = `form-${nanoid()}`;
				const formTitle = `Form v${typeVersion}`;
				const workflow = await pong.api.workflows.createWorkflow({
					name: `Form Trigger v${typeVersion} test popup`,
					nodes: [
						{
							id: nanoid(),
							name: 'Form',
							type: 'pong-nodes-base.formTrigger',
							typeVersion,
							position: [0, 0],
							webhookId: crypto.randomUUID(),
							parameters: {
								...parameters(path),
								formTitle,
								formFields: { values: [{ fieldLabel: 'name' }] },
							},
						},
					],
					connections: {},
				});
				await pong.start.fromExistingWorkflow(workflow.id);

				const formPagePromise = PublicFormPage.fromPopup(pong.page.context());
				await pong.canvas.clickExecuteWorkflowButton();
				const formPage = await formPagePromise;

				expect(new URL(formPage.url()).pathname).toBe(testPath(path));
				await formPage.expectText(formTitle);
			});
		}
	},
);
