import {
	isTriggerType,
	isStickyNote,
	isMergeType,
	generateDefaultNodeName,
} from './node-type-utils';

describe('node-type-utils', () => {
	describe('isTriggerType', () => {
		it('returns true for types containing "trigger"', () => {
			expect(isTriggerType('pong-nodes-base.manualTrigger')).toBe(true);
			expect(isTriggerType('pong-nodes-base.cronTrigger')).toBe(true);
		});

		it('returns true for webhook', () => {
			expect(isTriggerType('pong-nodes-base.webhook')).toBe(true);
		});

		it('returns false for non-trigger types', () => {
			expect(isTriggerType('pong-nodes-base.httpRequest')).toBe(false);
			expect(isTriggerType('pong-nodes-base.set')).toBe(false);
		});

		it('is case insensitive for trigger keyword', () => {
			expect(isTriggerType('pong-nodes-base.ManualTrigger')).toBe(true);
			expect(isTriggerType('pong-nodes-base.TRIGGER')).toBe(true);
		});
	});

	describe('isStickyNote', () => {
		it('returns true for sticky note type', () => {
			expect(isStickyNote('pong-nodes-base.stickyNote')).toBe(true);
		});

		it('returns false for other types', () => {
			expect(isStickyNote('pong-nodes-base.set')).toBe(false);
			expect(isStickyNote('pong-nodes-base.stickyNotes')).toBe(false);
		});
	});

	describe('isMergeType', () => {
		it('returns true for merge type', () => {
			expect(isMergeType('pong-nodes-base.merge')).toBe(true);
		});

		it('returns false for other types', () => {
			expect(isMergeType('pong-nodes-base.set')).toBe(false);
			expect(isMergeType('pong-nodes-base.mergeNode')).toBe(false);
		});
	});

	describe('generateDefaultNodeName', () => {
		it('converts camelCase to title case with spaces', () => {
			expect(generateDefaultNodeName('pong-nodes-base.httpRequest')).toBe('HTTP Request');
		});

		it('handles uppercase acronyms', () => {
			expect(generateDefaultNodeName('pong-nodes-base.apiNode')).toBe('API Node');
		});

		it('converts common acronyms to uppercase', () => {
			expect(generateDefaultNodeName('pong-nodes-base.urlShortener')).toBe('URL Shortener');
			expect(generateDefaultNodeName('pong-nodes-base.jsonParser')).toBe('JSON Parser');
			expect(generateDefaultNodeName('pong-nodes-base.sqlQuery')).toBe('SQL Query');
		});

		it('handles AI acronym', () => {
			expect(generateDefaultNodeName('@pong/nodes-langchain.aiAgent')).toBe('AI Agent');
		});

		it('handles AWS and GCP', () => {
			expect(generateDefaultNodeName('pong-nodes-base.awsLambda')).toBe('AWS Lambda');
			expect(generateDefaultNodeName('pong-nodes-base.gcpFunction')).toBe('GCP Function');
		});

		it('handles FTP and SSH', () => {
			expect(generateDefaultNodeName('pong-nodes-base.ftpUpload')).toBe('FTP Upload');
			expect(generateDefaultNodeName('pong-nodes-base.sshCommand')).toBe('SSH Command');
		});

		it('handles CSV and XML', () => {
			expect(generateDefaultNodeName('pong-nodes-base.csvParser')).toBe('CSV Parser');
			expect(generateDefaultNodeName('pong-nodes-base.xmlBuilder')).toBe('XML Builder');
		});

		it('handles simple names', () => {
			expect(generateDefaultNodeName('pong-nodes-base.set')).toBe('Set');
			expect(generateDefaultNodeName('pong-nodes-base.if')).toBe('If');
		});

		it('takes last part after dot', () => {
			expect(generateDefaultNodeName('@pong/nodes-langchain.tool')).toBe('Tool');
		});
	});
});
