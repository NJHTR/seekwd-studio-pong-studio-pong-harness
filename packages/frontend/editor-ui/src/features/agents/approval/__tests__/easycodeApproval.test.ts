import { describe, expect, it } from 'vitest';

import { findHostEventRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import { isApprovalGoneError } from '../../utils/errors';
import {
	buildEasycodeApprovalAnswers,
	easycodeApprovalExtension,
	easycodeApprovalExtensions,
	parseEasycodeApprovalHostEvent,
	parseEasycodeApprovalPayload,
} from '../easycodeApproval';

const COMMAND_PAYLOAD = {
	approvalId: 'approval-1',
	threadId: 'thread-1',
	turnId: 'turn-1',
	itemId: 'item-1',
	requestKind: 'command',
	title: 'Run a command',
	detail: 'Install the dependencies',
	command: 'npm install',
	cwd: '/work/project',
	reason: 'The build needs the packages.',
	availableDecisions: ['accept', 'decline', 'acceptForSession'],
	expiresAtMs: 1_763_000_000_000,
};

function hostEvent(name: string, payload: unknown): AgentsChatHostEvent {
	return { id: `${name}-1`, name, payload, key: 'approval:approval-1' };
}

function errorWithStatus(status: number): unknown {
	return { httpStatusCode: status };
}

describe('parseEasycodeApprovalPayload', () => {
	it('reads a command approval', () => {
		const parsed = parseEasycodeApprovalPayload(COMMAND_PAYLOAD);

		expect(parsed).toEqual({
			approvalId: 'approval-1',
			threadId: 'thread-1',
			turnId: 'turn-1',
			itemId: 'item-1',
			requestKind: 'command',
			title: 'Run a command',
			detail: 'Install the dependencies',
			command: 'npm install',
			cwd: '/work/project',
			reason: 'The build needs the packages.',
			availableDecisions: ['accept', 'decline', 'acceptForSession'],
			expiresAtMs: 1_763_000_000_000,
		});
	});

	it('folds null optional fields and defaults the decisions', () => {
		const parsed = parseEasycodeApprovalPayload({
			approvalId: 'approval-2',
			threadId: 'thread-2',
			requestKind: 'fileChange',
			command: null,
			cwd: null,
			reason: null,
			availableDecisions: null,
			expiresAtMs: null,
		});

		expect(parsed).toEqual({
			approvalId: 'approval-2',
			threadId: 'thread-2',
			requestKind: 'fileChange',
			availableDecisions: ['accept', 'decline'],
		});
	});

	it('rejects another event and a payload without the required fields', () => {
		expect(parseEasycodeApprovalHostEvent(hostEvent('easycode-plan', COMMAND_PAYLOAD))).toBe(
			undefined,
		);
		expect(parseEasycodeApprovalPayload({})).toBeUndefined();
		expect(parseEasycodeApprovalPayload({ ...COMMAND_PAYLOAD, requestKind: 'other' })).toBe(
			undefined,
		);
	});

	it('reads the input question, options and a question id when the backend sends one', () => {
		const parsed = parseEasycodeApprovalPayload({
			approvalId: 'approval-3',
			threadId: 'thread-3',
			requestKind: 'input',
			question: 'Which database?',
			options: ['Postgres', 'SQLite'],
			questionId: 'question-7',
		});

		expect(parsed?.question).toBe('Which database?');
		expect(parsed?.options).toEqual(['Postgres', 'SQLite']);
		expect(parsed).toMatchObject({ questionId: 'question-7' });
	});
});

describe('easycode approval renderer', () => {
	it('registers the renderer for easycode-approval-requested', () => {
		const event = hostEvent('easycode-approval-requested', COMMAND_PAYLOAD);

		expect(findHostEventRenderer(event, easycodeApprovalExtensions)).toEqual({
			component: easycodeApprovalExtension.hostEventComponent,
			placement: 'start',
		});
	});

	it('does not render an approval event with an invalid payload', () => {
		const event = hostEvent('easycode-approval-requested', { approvalId: 'approval-1' });

		expect(findHostEventRenderer(event, easycodeApprovalExtensions)).toBeUndefined();
	});

	it('does not render the events of other hosts', () => {
		expect(
			findHostEventRenderer(
				hostEvent('easycode-plan', { id: 'plan-1' }),
				easycodeApprovalExtensions,
			),
		).toBeUndefined();
	});
});

describe('buildEasycodeApprovalAnswers', () => {
	const parsed = parseEasycodeApprovalPayload({
		approvalId: 'approval-3',
		threadId: 'thread-3',
		requestKind: 'input',
		question: 'Which database?',
	});

	it('falls back to the positional question id when the payload has none', () => {
		expect(parsed).toBeDefined();
		if (!parsed) return;
		expect(buildEasycodeApprovalAnswers(parsed, 'Postgres')).toEqual({ '0': ['Postgres'] });
	});

	it('keys the answer by the question id when the payload sends one', () => {
		const withQuestionId = parseEasycodeApprovalPayload({
			approvalId: 'approval-4',
			threadId: 'thread-4',
			requestKind: 'input',
			question: 'Which database?',
			questionId: 'question-7',
		});
		expect(withQuestionId).toBeDefined();
		if (!withQuestionId) return;
		expect(buildEasycodeApprovalAnswers(withQuestionId, 'Postgres')).toEqual({
			'question-7': ['Postgres'],
		});
	});

	it('has no answers without an answer', () => {
		expect(parsed).toBeDefined();
		if (!parsed) return;
		expect(buildEasycodeApprovalAnswers(parsed, undefined)).toBeUndefined();
	});
});

describe('isApprovalGoneError', () => {
	it('treats 409 and 404 as an approval that can no longer apply', () => {
		expect(isApprovalGoneError(errorWithStatus(409))).toBe(true);
		expect(isApprovalGoneError(errorWithStatus(404))).toBe(true);
	});

	it('leaves other failures retryable', () => {
		expect(isApprovalGoneError(errorWithStatus(500))).toBe(false);
		expect(isApprovalGoneError(new Error('Network down'))).toBe(false);
		expect(isApprovalGoneError(undefined)).toBe(false);
	});
});
