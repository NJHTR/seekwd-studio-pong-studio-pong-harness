import { validateNodeName } from './validation';

describe('validateNodeName', () => {
	describe('valid names', () => {
		test.each([
			['unscoped name', 'pong-nodes-my-app'],
			['unscoped name with single segment', 'pong-nodes-app'],
			['unscoped name with numbers', 'pong-nodes-app2'],
			['unscoped name with many hyphenated segments', 'pong-nodes-my-really-long-app-name'],
			['scoped name', '@mycompany/pong-nodes-my-app'],
			['scoped name with hyphenated org', '@my-company/pong-nodes-my-app'],
			['scoped name with numbers', '@company2/pong-nodes-app'],
			['scoped name with dotted org (domain.tld)', '@example.com/pong-nodes-my-app'],
			['scoped name with dotted org (tld.domain)', '@com.example/pong-nodes-my-app'],
			['scoped name with multi-level dotted org', '@sub.example.com/pong-nodes-my-app'],
		])('accepts %s: %s', (_description, name) => {
			expect(validateNodeName(name)).toBeUndefined();
		});
	});

	describe('invalid names', () => {
		test.each([
			['missing prefix entirely', 'my-app'],
			['unscoped without trailing segment', 'pong-nodes-'],
			['unscoped with uppercase letters', 'pong-nodes-MyApp'],
			['unscoped with underscore', 'pong-nodes-my_app'],
			['unscoped with double hyphen', 'pong-nodes-my--app'],
			['unscoped with trailing hyphen', 'pong-nodes-my-app-'],
			['scoped missing org', '/pong-nodes-my-app'],
			['scoped missing leading @', 'mycompany/pong-nodes-my-app'],
			['scoped with uppercase org', '@MyCompany/pong-nodes-my-app'],
			['scoped with uppercase name', '@mycompany/pong-nodes-MyApp'],
			['scoped org with leading dot', '@.example/pong-nodes-my-app'],
			['scoped org with trailing dot', '@example./pong-nodes-my-app'],
			['scoped org with consecutive dots', '@example..com/pong-nodes-my-app'],
			['scoped without pong-nodes segment', '@mycompany/my-app'],
			['plain package name', 'my-app'],
			['whitespace only', '   '],
		])('rejects %s: %s', (_description, name) => {
			expect(validateNodeName(name)).toEqual(
				"Must start with 'pong-nodes-' or '@org/pong-nodes-'. Examples: pong-nodes-my-app, @mycompany/pong-nodes-my-app",
			);
		});
	});
});
