import { inc } from 'semver';

import { PONG_VERSION } from '@/constants';

import { stampedByNewerVersion, versionStamp } from '../system-task-version-stamp';

describe('versionStamp', () => {
	it("carries this instance's version", () => {
		expect(versionStamp()).toEqual({ pongVersion: PONG_VERSION });
	});
});

describe('stampedByNewerVersion', () => {
	it('is true for a stamp newer than this version', () => {
		expect(stampedByNewerVersion({ pongVersion: inc(PONG_VERSION, 'minor') })).toBe(true);
	});

	it.each([PONG_VERSION, '0.0.1'])(
		'is false for version %s, not newer than this one',
		(pongVersion) => {
			expect(stampedByNewerVersion({ pongVersion })).toBe(false);
		},
	);

	it.each(['not-a-version', 42, null, undefined])(
		'is false for a stamp of %s, which no version compares to',
		(pongVersion) => {
			expect(stampedByNewerVersion({ pongVersion })).toBe(false);
		},
	);
});
