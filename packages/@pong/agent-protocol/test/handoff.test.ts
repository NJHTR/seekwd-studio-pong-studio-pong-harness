import { describe, expect, it } from 'vitest';

import {
	DEFAULT_ARTIFACT_FILE_THRESHOLD,
	DEFAULT_PROSE_BUDGET_CHARS,
	HANDOFF_REASONS,
	selectHandoff,
	type HandoffCandidate,
	type HandoffReason,
} from '../src';

const smallProse = 'append three lines to f01.txt';

describe('adaptive handoff: size thresholds', () => {
	it('keeps small payloads in prose mode', () => {
		const decision = selectHandoff({ prose: smallProse });

		expect(decision.mode).toBe('prose');
		expect(decision.reason).toBe('within_prose_budget');
		expect(decision.proseChars).toBe(smallProse.length);
	});

	it('treats the budget boundary as inclusive', () => {
		const budget = DEFAULT_PROSE_BUDGET_CHARS;

		expect(selectHandoff({ prose: 'x'.repeat(budget) }).mode).toBe('prose');
		expect(selectHandoff({ prose: 'x'.repeat(budget + 1) }).mode).toBe('artifact');
		expect(selectHandoff({ prose: 'x'.repeat(budget + 1) }).reason).toBe('over_prose_budget');
	});

	it('honours a custom prose budget', () => {
		expect(selectHandoff({ prose: 'x'.repeat(10) }, { proseBudgetChars: 10 }).mode).toBe('prose');
		expect(selectHandoff({ prose: 'x'.repeat(11) }, { proseBudgetChars: 10 }).mode).toBe(
			'artifact',
		);
	});

	it('counts Unicode code points, not UTF-16 units', () => {
		const emoji = '😀😀😀';

		expect(selectHandoff({ prose: emoji }).proseChars).toBe(3);
	});

	it('reports UTF-8 estimated bytes', () => {
		expect(selectHandoff({ prose: '汉字' }).estimatedBytes).toBe(6);
		expect(selectHandoff({ prose: '' }).estimatedBytes).toBe(0);
	});
});

describe('adaptive handoff: multi-file threshold', () => {
	it('uses prose at the file threshold and artifact above it', () => {
		const threshold = DEFAULT_ARTIFACT_FILE_THRESHOLD;

		expect(selectHandoff({ prose: smallProse, fileCount: threshold }).mode).toBe('prose');
		expect(selectHandoff({ prose: smallProse, fileCount: threshold + 1 }).mode).toBe('artifact');
		expect(selectHandoff({ prose: smallProse, fileCount: threshold + 1 }).reason).toBe(
			'multi_file',
		);
	});

	it('falls back to changedFiles length', () => {
		const files = ['a.ts', 'b.ts', 'c.ts', 'd.ts'];

		expect(selectHandoff({ prose: smallProse, changedFiles: files }).mode).toBe('artifact');
		expect(selectHandoff({ prose: smallProse, changedFiles: files.slice(0, 3) }).mode).toBe(
			'prose',
		);
	});

	it('prefers an explicit fileCount over changedFiles', () => {
		const decision = selectHandoff({
			prose: smallProse,
			fileCount: 1,
			changedFiles: ['a', 'b', 'c', 'd', 'e'],
		});

		expect(decision.mode).toBe('prose');
	});
});

describe('adaptive handoff: fidelity requirements', () => {
	const fidelityCases: ReadonlyArray<{
		candidate: HandoffCandidate;
		reason: HandoffReason;
	}> = [
		{
			candidate: { prose: smallProse, requiresByteFidelity: true },
			reason: 'byte_fidelity_required',
		},
		{ candidate: { prose: smallProse, requiresDiff: true }, reason: 'diff_required' },
		{ candidate: { prose: smallProse, requiresManifest: true }, reason: 'manifest_required' },
	];

	it('escalates when a fidelity flag is set', () => {
		for (const { candidate, reason } of fidelityCases) {
			const decision = selectHandoff(candidate);

			expect(decision.mode).toBe('artifact');
			expect(decision.reason).toBe(reason);
		}
	});

	it('lets fidelity win over multi-file', () => {
		const decision = selectHandoff({
			prose: smallProse,
			fileCount: 10,
			requiresByteFidelity: true,
		});

		expect(decision.reason).toBe('byte_fidelity_required');
	});

	it('lets multi-file win over the prose budget', () => {
		const decision = selectHandoff({ prose: 'x'.repeat(10_000), fileCount: 4 });

		expect(decision.reason).toBe('multi_file');
	});
});

describe('adaptive handoff: validation', () => {
	it('exposes the frozen reason vocabulary', () => {
		expect(HANDOFF_REASONS).toEqual([
			'within_prose_budget',
			'over_prose_budget',
			'byte_fidelity_required',
			'diff_required',
			'manifest_required',
			'multi_file',
		]);
	});

	it('rejects invalid budgets', () => {
		expect(() => selectHandoff({ prose: '' }, { proseBudgetChars: 0 })).toThrow(RangeError);
		expect(() => selectHandoff({ prose: '' }, { proseBudgetChars: -1 })).toThrow(RangeError);
		expect(() => selectHandoff({ prose: '' }, { proseBudgetChars: 1.5 })).toThrow(RangeError);
	});

	it('rejects invalid file thresholds', () => {
		expect(() => selectHandoff({ prose: '' }, { artifactFileThreshold: 0 })).toThrow(RangeError);
	});

	it('rejects negative file counts', () => {
		expect(() => selectHandoff({ prose: '', fileCount: -1 })).toThrow(RangeError);
	});
});
