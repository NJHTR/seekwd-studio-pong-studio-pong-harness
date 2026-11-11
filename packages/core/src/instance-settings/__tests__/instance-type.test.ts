import { instanceTypeFromArgv } from '../instance-type';

describe('instanceTypeFromArgv', () => {
	it.each([
		{ argv: ['node', 'pong', 'worker'], expected: 'worker' },
		{ argv: ['node', 'pong', 'start'], expected: 'main' },
		{ argv: ['node', 'pong'], expected: 'main' },
	])('returns $expected for $argv', ({ argv, expected }) => {
		expect(instanceTypeFromArgv(argv)).toBe(expected);
	});
});
