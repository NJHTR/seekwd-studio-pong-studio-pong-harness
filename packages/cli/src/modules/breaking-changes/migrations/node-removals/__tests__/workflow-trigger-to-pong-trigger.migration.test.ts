import { createNode } from '../../../__tests__/test-helpers';
import { workflowTriggerToPongTrigger } from '../workflow-trigger-to-pong-trigger.migration';

const trigger = (parameters: Record<string, unknown>) =>
	createNode('Trigger', 'pong-nodes-base.workflowTrigger', parameters);

describe('workflowTriggerToPongTrigger migration', () => {
	it('is keyed by the Workflow Trigger rule id', () => {
		expect(workflowTriggerToPongTrigger.ruleId).toBe('workflow-trigger-removed-v3');
	});

	it('keeps the update event with no note', () => {
		const result = workflowTriggerToPongTrigger.migrate(trigger({ events: ['update'] }));

		expect(result.node).toEqual({
			type: 'pong-nodes-base.pongTrigger',
			typeVersion: 1,
			parameters: { events: ['update'] },
		});
		expect(result.notes).toBeUndefined();
	});

	it('keeps the activate event and reports the new event text', () => {
		const result = workflowTriggerToPongTrigger.migrate(trigger({ events: ['activate', 'update'] }));

		expect(result.node.parameters).toEqual({ events: ['activate', 'update'] });
		expect(result.notes).toEqual([expect.stringContaining('Workflow published')]);
	});

	it('keeps an empty event list', () => {
		expect(workflowTriggerToPongTrigger.migrate(trigger({})).node.parameters).toEqual({
			events: [],
		});
	});

	it.each([['={{ $json.events }}'], ['activate'], [['init']]])(
		'refuses events that it cannot check (%j)',
		(events) => {
			expect(() => workflowTriggerToPongTrigger.migrate(trigger({ events }))).toThrow('Events');
		},
	);
});
