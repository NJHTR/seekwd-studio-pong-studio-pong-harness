import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { saveDestinationToDb } from '@pong/rest-api-client/api/eventbus.ee';

import { useLogStreamingStore } from './logStreaming.store';

vi.mock('@pong/rest-api-client/api/eventbus.ee', async (importOriginal) => ({
	...(await importOriginal<typeof import('@pong/rest-api-client/api/eventbus.ee')>()),
	saveDestinationToDb: vi.fn(),
}));

describe('LogStreamingStore', () => {
	let logStreamingStore: ReturnType<typeof useLogStreamingStore>;

	beforeAll(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		logStreamingStore = useLogStreamingStore();
	});

	describe('addEventName', () => {
		it('should add a new event name', () => {
			logStreamingStore.addEventName('pong.node.started');
			logStreamingStore.addEventName('pong.node.success');
			logStreamingStore.addEventName('pong.node.failed');
		});
	});

	describe('addDestination', () => {
		it('should add a new destination', () => {
			logStreamingStore.addDestination({
				id: 'destinationId',
				label: 'Test Destination',
				enabled: true,
				subscribedEvents: [],
				anonymizeAuditMessages: false,
			});
			expect(logStreamingStore.items.destinationId).toBeDefined();
			expect(logStreamingStore.items.destinationId.destination.label).toBe('Test Destination');
			expect(logStreamingStore.items.destinationId.eventGroups).toHaveLength(2);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'pong.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.children).toHaveLength(3);
			expect(nodeEventGroup!.children.every((c) => !c.selected)).toBe(true);
		});
	});

	describe('setSelectedInGroup', () => {
		it('should select the group and unselect all children', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node', true);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'pong.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(true);
			expect(nodeEventGroup!.children.every((e) => !e.selected)).toBe(true);
		});

		it('should select an event in a group and mark the group as indeterminate', () => {
			logStreamingStore.addSelectedEvent('destinationId', 'pong.node.started');
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'pong.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.indeterminate).toBe(true);
			const startedEvent = nodeEventGroup!.children.find((e) => e.name === 'pong.node.started');
			expect(startedEvent?.selected).toBe(true);
		});

		it('should select the group if all children are selected', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.started', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.success', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.failed', true);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'pong.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(true);
			expect(nodeEventGroup!.indeterminate).toBe(false);
			expect(nodeEventGroup!.children.every((e) => !e.selected)).toBe(true);
		});

		it('should deselect the group if any child is deselected', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.success', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.failed', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.started', false);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'pong.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(false);
			expect(nodeEventGroup!.indeterminate).toBe(true);
		});

		it('should unset the group indeterminate state if no children are selected', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.success', false);
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.failed', false);
			logStreamingStore.setSelectedInGroup('destinationId', 'pong.node.started', false);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'pong.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(false);
			expect(nodeEventGroup!.indeterminate).toBe(false);
		});
	});

	describe('event group boundaries', () => {
		it('should not put a longer group under one that only shares leading characters', () => {
			logStreamingStore.addEventName('pong.foo.created');
			logStreamingStore.addEventName('pong.foobar.created');

			logStreamingStore.addDestination({
				id: 'boundaryDestination',
				label: 'Boundary Destination',
				enabled: true,
				subscribedEvents: [],
				anonymizeAuditMessages: false,
			});

			const groups = logStreamingStore.items.boundaryDestination.eventGroups;
			const fooGroup = groups.find((group) => group.name === 'pong.foo');
			const foobarGroup = groups.find((group) => group.name === 'pong.foobar');

			// `pong.foobar` starts with `pong.foo`, but the two are distinct groups on a
			// segment boundary: neither must swallow the other's events.
			expect(fooGroup!.children.map((c) => c.name)).toEqual(['pong.foo.created']);
			expect(foobarGroup!.children.map((c) => c.name)).toEqual(['pong.foobar.created']);
		});
	});

	describe('saveDestination', () => {
		it('updates the destination after a successful save', async () => {
			vi.mocked(saveDestinationToDb).mockResolvedValueOnce({});
			const destination = { id: 'destinationId', label: 'Updated label' };
			await expect(logStreamingStore.saveDestination(destination)).resolves.toBe(true);
			expect(logStreamingStore.items.destinationId.destination).toEqual(destination);
		});

		it('should pass save errors to the caller', async () => {
			const error = new Error('Invalid URL');
			const savedDestination = { ...logStreamingStore.items.destinationId.destination };
			vi.mocked(saveDestinationToDb).mockRejectedValueOnce(error);

			await expect(
				logStreamingStore.saveDestination({
					id: 'destinationId',
				}),
			).rejects.toBe(error);
			expect(logStreamingStore.items.destinationId.destination).toEqual(savedDestination);
		});
	});
});
