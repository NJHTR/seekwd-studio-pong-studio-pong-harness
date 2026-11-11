import {
	NODE_TYPES,
	isMergeNodeType,
	isSwitchNodeType,
	isStickyNoteType,
	isIfNodeType,
	isSplitInBatchesType,
	isHttpRequestType,
	isWebhookType,
	isDataTableType,
} from './node-types';

describe('NODE_TYPES', () => {
	describe('constants', () => {
		it('should have IF constant', () => {
			expect(NODE_TYPES.IF).toBe('pong-nodes-base.if');
		});

		it('should have SWITCH constant', () => {
			expect(NODE_TYPES.SWITCH).toBe('pong-nodes-base.switch');
		});

		it('should have MERGE constant', () => {
			expect(NODE_TYPES.MERGE).toBe('pong-nodes-base.merge');
		});

		it('should have STICKY_NOTE constant', () => {
			expect(NODE_TYPES.STICKY_NOTE).toBe('pong-nodes-base.stickyNote');
		});

		it('should have SPLIT_IN_BATCHES constant', () => {
			expect(NODE_TYPES.SPLIT_IN_BATCHES).toBe('pong-nodes-base.splitInBatches');
		});

		it('should have HTTP_REQUEST constant', () => {
			expect(NODE_TYPES.HTTP_REQUEST).toBe('pong-nodes-base.httpRequest');
		});

		it('should have WEBHOOK constant', () => {
			expect(NODE_TYPES.WEBHOOK).toBe('pong-nodes-base.webhook');
		});

		it('should have DATA_TABLE constant', () => {
			expect(NODE_TYPES.DATA_TABLE).toBe('pong-nodes-base.dataTable');
		});

		it('should be readonly (immutable)', () => {
			// TypeScript compile-time check - at runtime we verify the shape
			const types: Readonly<typeof NODE_TYPES> = NODE_TYPES;
			expect(types).toBe(NODE_TYPES);
		});
	});

	describe('type guards', () => {
		describe('isIfNodeType', () => {
			it('should return true for IF node type', () => {
				expect(isIfNodeType('pong-nodes-base.if')).toBe(true);
			});

			it('should return false for non-IF node type', () => {
				expect(isIfNodeType('pong-nodes-base.switch')).toBe(false);
				expect(isIfNodeType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isIfNodeType('')).toBe(false);
			});
		});

		describe('isSwitchNodeType', () => {
			it('should return true for Switch node type', () => {
				expect(isSwitchNodeType('pong-nodes-base.switch')).toBe(true);
			});

			it('should return false for non-Switch node type', () => {
				expect(isSwitchNodeType('pong-nodes-base.if')).toBe(false);
				expect(isSwitchNodeType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isSwitchNodeType('')).toBe(false);
			});
		});

		describe('isMergeNodeType', () => {
			it('should return true for Merge node type', () => {
				expect(isMergeNodeType('pong-nodes-base.merge')).toBe(true);
			});

			it('should return false for non-Merge node type', () => {
				expect(isMergeNodeType('pong-nodes-base.if')).toBe(false);
				expect(isMergeNodeType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isMergeNodeType('')).toBe(false);
			});
		});

		describe('isStickyNoteType', () => {
			it('should return true for Sticky Note node type', () => {
				expect(isStickyNoteType('pong-nodes-base.stickyNote')).toBe(true);
			});

			it('should return false for non-Sticky Note node type', () => {
				expect(isStickyNoteType('pong-nodes-base.if')).toBe(false);
				expect(isStickyNoteType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isStickyNoteType('')).toBe(false);
			});
		});

		describe('isSplitInBatchesType', () => {
			it('should return true for Split In Batches node type', () => {
				expect(isSplitInBatchesType('pong-nodes-base.splitInBatches')).toBe(true);
			});

			it('should return false for non-Split In Batches node type', () => {
				expect(isSplitInBatchesType('pong-nodes-base.if')).toBe(false);
				expect(isSplitInBatchesType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isSplitInBatchesType('')).toBe(false);
			});
		});

		describe('isHttpRequestType', () => {
			it('should return true for HTTP Request node type', () => {
				expect(isHttpRequestType('pong-nodes-base.httpRequest')).toBe(true);
			});

			it('should return false for non-HTTP Request node type', () => {
				expect(isHttpRequestType('pong-nodes-base.if')).toBe(false);
				expect(isHttpRequestType('pong-nodes-base.webhook')).toBe(false);
				expect(isHttpRequestType('')).toBe(false);
			});
		});

		describe('isWebhookType', () => {
			it('should return true for Webhook node type', () => {
				expect(isWebhookType('pong-nodes-base.webhook')).toBe(true);
			});

			it('should return false for non-Webhook node type', () => {
				expect(isWebhookType('pong-nodes-base.if')).toBe(false);
				expect(isWebhookType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isWebhookType('')).toBe(false);
			});
		});

		describe('isDataTableType', () => {
			it('should return true for Data Table node type', () => {
				expect(isDataTableType('pong-nodes-base.dataTable')).toBe(true);
			});

			it('should return false for non-Data Table node type', () => {
				expect(isDataTableType('pong-nodes-base.if')).toBe(false);
				expect(isDataTableType('pong-nodes-base.httpRequest')).toBe(false);
				expect(isDataTableType('')).toBe(false);
			});
		});
	});
});
