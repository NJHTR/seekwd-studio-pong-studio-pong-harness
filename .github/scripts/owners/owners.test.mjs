import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	assignOwnership,
	findOwningEntry,
	ownershipsToAllocations,
	parseOwnersContent,
	parseOwnersFile,
	resolveRequiredTeams,
	teamHandleToSlug,
	validateOwners,
} from './owners.mjs';

/**
 * Run these tests by running
 *
 * node --test ./.github/scripts/owners/owners.test.mjs
 * */

/** @param {Partial<import('./owners.mjs').OwnersEntry>} entry */
function entry(entry) {
	return { team: '@pong-io/some-team', required: false, line: 1, pattern: '*', ...entry };
}

describe('parseOwnersContent', () => {
	it('parses well-formed OWNERS lines into entries', () => {
		const content = [
			'# header comment',
			'',
			'*                            @pong-io/catalysts',
			'packages/cli/                @pong-io/cli-team',
			'packages/foo/bar.ts          @pong-io/some-team',
		].join('\n');

		assert.deepEqual(parseOwnersContent(content), [
			{ pattern: '*', team: '@pong-io/catalysts', required: false, line: 3 },
			{ pattern: 'packages/cli/', team: '@pong-io/cli-team', required: false, line: 4 },
			{ pattern: 'packages/foo/bar.ts', team: '@pong-io/some-team', required: false, line: 5 },
		]);
	});

	it('parses the `required` option after the team', () => {
		const entries = parseOwnersContent('pkg/  @pong-io/keepers required');

		assert.deepEqual(entries, [
			{ pattern: 'pkg/', team: '@pong-io/keepers', required: true, line: 1 },
		]);
	});

	it('throws on a second team', () => {
		assert.throws(
			() => parseOwnersContent('pkg/  @pong-io/keepers @pong-io/others'),
			/OWNERS line 1: only one team per pattern is supported/,
		);
	});

	it('ignores inline comments', () => {
		const entries = parseOwnersContent('pkg/  @pong-io/keepers # the why');

		assert.equal(entries[0].team, '@pong-io/keepers');
	});

	it('throws on an unknown token with the line number', () => {
		assert.throws(
			() => parseOwnersContent('# comment\npkg/  @pong-io/keepers banana'),
			/OWNERS line 2: unknown token "banana"/,
		);
	});

	it('throws when a pattern has no team', () => {
		assert.throws(() => parseOwnersContent('pkg/ required'), /OWNERS line 1: no team/);
	});

	it('throws when a team comes after an option', () => {
		assert.throws(
			() => parseOwnersContent('pkg/ @pong-io/keepers required @pong-io/others'),
			/OWNERS line 1: team "@pong-io\/others" must come before options/,
		);
	});

	it('returns an empty array for comment-only content', () => {
		assert.deepEqual(parseOwnersContent('# nothing here\n\n'), []);
	});
});

describe('parseOwnersFile', () => {
	it('reads the real OWNERS file into well-formed entries', () => {
		const entries = parseOwnersFile();

		assert.ok(entries.length > 0, 'OWNERS file should not be empty');
		assert.ok(
			entries.every((e) => e.team && e.pattern),
			'every parsed entry should have both a team and a pattern',
		);
		assert.ok(
			entries.every((e) => e.team.startsWith('@pong-io/')),
			'every parsed team should belong to the @pong-io org',
		);
	});

	it('the real OWNERS file passes validation', () => {
		assert.deepEqual(validateOwners(parseOwnersFile()), []);
	});
});

describe('validateOwners', () => {
	// Path kind stub matching the pattern shape, for tests about other rules.
	const kindFromShape = (pattern) => (pattern.endsWith('/') ? 'directory' : 'file');

	it('reports duplicate patterns with both line numbers', () => {
		const entries = [
			entry({ pattern: 'pkg/', line: 3 }),
			entry({ pattern: 'pkg/', line: 7 }),
		];

		const errors = validateOwners(entries, kindFromShape);

		assert.equal(errors.length, 1);
		assert.match(errors[0], /duplicate pattern "pkg\/" \(lines 3 and 7\)/);
	});

	it('reports patterns that do not exist, except the catch-all', () => {
		const entries = [entry({ pattern: '*' }), entry({ pattern: 'gone/', line: 2 })];

		const errors = validateOwners(entries, () => null);

		assert.equal(errors.length, 1);
		assert.match(errors[0], /pattern "gone\/" \(line 2\) does not exist/);
	});

	it('reports a directory pattern that points at a file', () => {
		const errors = validateOwners([entry({ pattern: 'pkg/', line: 1 })], () => 'file');

		assert.equal(errors.length, 1);
		assert.match(errors[0], /pattern "pkg\/" \(line 1\) is a file; remove the trailing "\/"/);
	});

	it('reports a file pattern that points at a directory', () => {
		const errors = validateOwners([entry({ pattern: 'pkg', line: 1 })], () => 'directory');

		assert.equal(errors.length, 1);
		assert.match(errors[0], /pattern "pkg" \(line 1\) is a directory; add a trailing "\/"/);
	});

	it('returns no errors for a valid set of entries', () => {
		const entries = [
			entry({ pattern: '*' }),
			entry({ pattern: 'pkg/', line: 2 }),
			entry({ pattern: 'pkg/a.ts', line: 3 }),
		];

		assert.deepEqual(validateOwners(entries, kindFromShape), []);
	});
});


describe('teamHandleToSlug', () => {
	it('strips the org prefix from an OWNERS team handle', () => {
		assert.equal(teamHandleToSlug('@pong-io/catalysts'), 'catalysts');
	});

	it('leaves a bare slug untouched', () => {
		assert.equal(teamHandleToSlug('catalysts'), 'catalysts');
	});
});

describe('findOwningEntry', () => {
	it('returns the last matching entry', () => {
		const entries = [
			entry({ pattern: '*', team: '@pong-io/catalysts' }),
			entry({ pattern: 'pkg/', team: '@pong-io/keepers' }),
		];

		assert.equal(findOwningEntry('pkg/a.ts', entries), entries[1]);
		assert.equal(findOwningEntry('other.ts', entries), entries[0]);
	});

	it('returns undefined when nothing matches', () => {
		assert.equal(findOwningEntry('a.ts', [entry({ pattern: 'pkg/' })]), undefined);
	});
});

describe('assignOwnership', () => {
	it('assigns every file to the catch-all team when only `*` is defined', () => {
		const files = new Set(['a.ts', 'packages/cli/src/index.ts', 'docs/readme.md']);
		const owners = [entry({ pattern: '*', team: '@pong-io/catalysts' })];

		const result = assignOwnership(files, owners);

		assert.deepEqual(
			result.get('@pong-io/catalysts')?.sort(),
			[...files].sort(),
		);
		assert.equal(result.size, 1);
	});

	it('applies last-match-wins: a later specific rule overrides the catch-all', () => {
		const files = new Set([
			'README.md',
			'packages/cli/src/index.ts',
			'packages/cli/src/lib/foo.ts',
		]);
		const owners = [
			entry({ pattern: '*', team: '@pong-io/catalysts' }),
			entry({ pattern: 'packages/cli/', team: '@pong-io/cli-team' }),
		];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@pong-io/catalysts'), ['README.md']);
		assert.deepEqual(
			result.get('@pong-io/cli-team')?.sort(),
			['packages/cli/src/index.ts', 'packages/cli/src/lib/foo.ts'].sort(),
		);
	});

	it('matches a directory pattern recursively', () => {
		const files = new Set([
			'packages/cli/src/deep/nested/file.ts',
			'packages/cli/package.json',
		]);
		const owners = [entry({ pattern: 'packages/cli/', team: '@pong-io/cli-team' })];

		const result = assignOwnership(files, owners);

		assert.deepEqual(
			result.get('@pong-io/cli-team')?.sort(),
			[...files].sort(),
		);
	});

	it('matches an exact file pattern only against that file', () => {
		const files = new Set([
			'packages/cli/src/controllers/ai.controller.ts',
			'packages/cli/src/controllers/other.controller.ts',
		]);
		const owners = [
			entry({
				pattern: 'packages/cli/src/controllers/ai.controller.ts',
				team: '@pong-io/ai-team',
			}),
		];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@pong-io/ai-team'), [
			'packages/cli/src/controllers/ai.controller.ts',
		]);
		// the other controller matched no rule, so it must be omitted entirely
		assert.equal(result.size, 1);
	});

	it('omits files that match no rule (no catch-all present)', () => {
		const files = new Set(['unowned/file.ts', 'packages/cli/src/x.ts']);
		const owners = [entry({ pattern: 'packages/cli/', team: '@pong-io/cli-team' })];

		const result = assignOwnership(files, owners);

		assert.deepEqual(result.get('@pong-io/cli-team'), ['packages/cli/src/x.ts']);
		assert.equal(result.size, 1);
	});

	it('returns an empty Map when there are no changed files', () => {
		const owners = [entry({ pattern: '*', team: '@pong-io/catalysts' })];
		const result = assignOwnership(new Set(), owners);

		assert.equal(result.size, 0);
	});
});

describe('resolveRequiredTeams', () => {
	const owners = [
		entry({ pattern: '*', team: '@pong-io/catalysts' }),
		entry({ pattern: '.github/', team: '@pong-io/qa-dx' }),
		entry({ pattern: '.github/workflows/', team: '@pong-io/qa-dx', required: true }),
		entry({ pattern: 'db/migrations/', team: '@pong-io/migrations-review', required: true }),
	];

	it('collects the teams of `required` entries that win for a changed file', () => {
		const result = resolveRequiredTeams(
			new Set(['.github/workflows/ci.yml', 'db/migrations/1-init.ts', 'src/a.ts']),
			owners,
		);

		assert.deepEqual(result.get('@pong-io/qa-dx'), ['.github/workflows/ci.yml']);
		assert.deepEqual(result.get('@pong-io/migrations-review'), ['db/migrations/1-init.ts']);
		assert.equal(result.size, 2);
	});

	it('ignores files whose winning entry is not required', () => {
		const result = resolveRequiredTeams(new Set(['OWNERS', 'src/a.ts']), owners);

		assert.equal(result.size, 0);
	});

	it('ignores test files whose winning entry is required', () => {
		const result = resolveRequiredTeams(
			new Set([
				'.github/scripts/check.test.mjs',
				'.github/workflows/__tests__/check.ts',
				'.github/workflows/ci.yml',
			]),
			[
				entry({ pattern: '.github/scripts/', team: '@pong-io/qa-dx', required: true }),
				entry({ pattern: '.github/workflows/', team: '@pong-io/qa-dx', required: true }),
			],
		);

		assert.deepEqual(result.get('@pong-io/qa-dx'), ['.github/workflows/ci.yml']);
	});

	it('a later non-required entry overrides an earlier required one', () => {
		const result = resolveRequiredTeams(new Set(['db/migrations/1-init.ts']), [
			entry({ pattern: 'db/', team: '@pong-io/migrations-review', required: true }),
			entry({ pattern: 'db/migrations/', team: '@pong-io/catalysts' }),
		]);

		assert.equal(result.size, 0);
	});

	it('lists files deterministically (sorted) per team', () => {
		const result = resolveRequiredTeams(
			new Set(['.github/workflows/z.yml', '.github/workflows/a.yml']),
			owners,
		);

		assert.deepEqual(result.get('@pong-io/qa-dx'), [
			'.github/workflows/a.yml',
			'.github/workflows/z.yml',
		]);
	});
});

describe('ownershipsToAllocations', () => {
	it('converts a Map of team -> files into Allocation[] with fileCount', () => {
		const ownerships = new Map([
			['@pong-io/cli-team', ['a.ts', 'b.ts', 'c.ts']],
			['@pong-io/catalysts', ['README.md']],
		]);

		const result = ownershipsToAllocations(ownerships);

		assert.deepEqual(result, [
			{ team: '@pong-io/cli-team', fileCount: 3 },
			{ team: '@pong-io/catalysts', fileCount: 1 },
		]);
	});

	it('returns an empty array for an empty Map', () => {
		assert.deepEqual(ownershipsToAllocations(new Map()), []);
	});
});
