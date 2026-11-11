import {
	PONG_NODES_API_VERSION,
	checkNodesApiVersion,
	formatNodesApiLevel,
	parseNodesApiLevel,
} from '../src/nodes-api-version';

const pkg = (pongNodesApiVersion?: unknown) => ({
	pong: pongNodesApiVersion === undefined ? {} : { pongNodesApiVersion },
});

const { major: supportedMajor, minor: supportedMinor } = parseNodesApiLevel(PONG_NODES_API_VERSION)!;

describe('PONG_NODES_API_VERSION', () => {
	it('is a level written as major.minor', () => {
		expect(PONG_NODES_API_VERSION).toBe(
			formatNodesApiLevel(parseNodesApiLevel(PONG_NODES_API_VERSION)!),
		);
	});
});

describe('checkNodesApiVersion', () => {
	it('treats a missing pong section as legacy level 1', () => {
		expect(checkNodesApiVersion({})).toEqual({ compatible: true });
	});

	it('treats a missing pongNodesApiVersion as legacy level 1', () => {
		expect(checkNodesApiVersion(pkg())).toEqual({ compatible: true });
	});

	it('accepts the integer 1', () => {
		expect(checkNodesApiVersion(pkg(1))).toEqual({ compatible: true });
	});

	it('accepts the supported level', () => {
		expect(checkNodesApiVersion(pkg(PONG_NODES_API_VERSION))).toEqual({ compatible: true });
	});

	it('accepts a minor below the supported one', () => {
		if (supportedMinor === 0) return;
		expect(checkNodesApiVersion(pkg(`${supportedMajor}.${supportedMinor - 1}`))).toEqual({
			compatible: true,
		});
	});

	it('rejects one minor above the supported level', () => {
		const above = `${supportedMajor}.${supportedMinor + 1}`;
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
			required: above,
		});
	});

	it('rejects the next major at minor 0', () => {
		const above = `${supportedMajor + 1}.0`;
		expect(checkNodesApiVersion(pkg(above))).toEqual({
			compatible: false,
			reason: 'unsupported',
			declared: above,
			required: above,
		});
	});

	it('reports an integer level as major.minor', () => {
		expect(checkNodesApiVersion(pkg(supportedMajor + 1))).toMatchObject({
			required: `${supportedMajor + 1}.0`,
		});
	});

	it.each(['3.1.0', 'three', 0, -1, 2.5, 3.1, null, NaN, true, {}, '9007199254740992'])(
		'rejects the malformed value %p',
		(declared) => {
			expect(checkNodesApiVersion(pkg(declared))).toEqual({
				compatible: false,
				reason: 'malformed',
				declared,
			});
		},
	);
});
