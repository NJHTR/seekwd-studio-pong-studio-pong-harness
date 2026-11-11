import { PongTrigger } from '../PongTrigger.node';

describe('PongTrigger', () => {
	let pongTrigger: PongTrigger;
	let mockTriggerFunctions: any;

	beforeEach(() => {
		pongTrigger = new PongTrigger();

		// Mock trigger functions
		mockTriggerFunctions = {
			emit: vi.fn(),
			getNodeParameter: vi.fn(),
			getActivationMode: vi.fn(),
			getWorkflow: vi.fn(() => ({ id: 'test-workflow-id' })),
			helpers: {
				returnJsonArray: vi.fn((data) => data),
			},
		};
	});

	describe('trigger', () => {
		it('should emit event when activation mode matches selected events', async () => {
			mockTriggerFunctions.getNodeParameter.mockReturnValue(['activate']);
			mockTriggerFunctions.getActivationMode.mockReturnValue('activate');

			await pongTrigger.trigger.call(mockTriggerFunctions);

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith([
				[
					{
						event: 'Workflow published',
						timestamp: expect.any(String),
						workflow_id: 'test-workflow-id',
					},
				],
			]);
		});

		it('should not emit event when activation mode does not match selected events', async () => {
			mockTriggerFunctions.getNodeParameter.mockReturnValue(['update']);
			mockTriggerFunctions.getActivationMode.mockReturnValue('activate');

			await pongTrigger.trigger.call(mockTriggerFunctions);

			expect(mockTriggerFunctions.emit).not.toHaveBeenCalled();
		});

		it('should return manual trigger function', async () => {
			const result = await pongTrigger.trigger.call(mockTriggerFunctions);

			expect(result).toHaveProperty('manualTriggerFunction');
			expect(typeof result.manualTriggerFunction).toBe('function');
		});

		it('should emit correct event for instance started', async () => {
			mockTriggerFunctions.getNodeParameter.mockReturnValue(['init']);
			mockTriggerFunctions.getActivationMode.mockReturnValue('init');

			await pongTrigger.trigger.call(mockTriggerFunctions);

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith([
				[
					{
						event: 'Instance started',
						timestamp: expect.any(String),
						workflow_id: 'test-workflow-id',
					},
				],
			]);
		});

		it('should emit correct event for workflow updated', async () => {
			mockTriggerFunctions.getNodeParameter.mockReturnValue(['update']);
			mockTriggerFunctions.getActivationMode.mockReturnValue('update');

			await pongTrigger.trigger.call(mockTriggerFunctions);

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith([
				[
					{
						event: 'Workflow updated',
						timestamp: expect.any(String),
						workflow_id: 'test-workflow-id',
					},
				],
			]);
		});
	});

	describe('description', () => {
		it('should have correct properties', () => {
			expect(pongTrigger.description).toMatchObject({
				displayName: 'pong Trigger',
				name: 'pongTrigger',
				group: ['trigger'],
				version: 1,
			});
		});

		it('should have required properties configuration', () => {
			const eventsProperty = pongTrigger.description.properties.find((p) => p.name === 'events');
			expect(eventsProperty).toBeDefined();
			expect(eventsProperty?.required).toBe(true);
			expect(eventsProperty?.type).toBe('multiOptions');
		});
	});
});
