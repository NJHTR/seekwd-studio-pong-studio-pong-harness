import { fireEvent } from '@testing-library/vue';
import { ResponseError } from '@pong/rest-api-client';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import EasycodeApprovalCard from '../EasycodeApprovalCard.vue';

const { decideEasycodeApprovalMock } = vi.hoisted(() => ({
	decideEasycodeApprovalMock: vi.fn(),
}));

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	decideEasycodeApproval: decideEasycodeApprovalMock,
}));

vi.mock('@pong/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

const renderCard = createComponentRenderer(EasycodeApprovalCard);

const BASE_TIME = new Date('2026-11-13T03:00:00.000Z');
const EXPIRES_AT = BASE_TIME.getTime() + 60_000;

const COMMAND_PAYLOAD = {
	approvalId: 'approval-1',
	threadId: 'thread-1',
	turnId: 'turn-1',
	itemId: 'item-1',
	requestKind: 'command',
	detail: 'Install the dependencies',
	command: 'npm install',
	cwd: '/work/project',
	reason: 'The build needs the packages.',
	availableDecisions: ['accept', 'decline', 'acceptForSession'],
	expiresAtMs: EXPIRES_AT,
};

function hostEvent(payload: unknown): AgentsChatHostEvent {
	return {
		id: 'event-1',
		name: 'easycode-approval-requested',
		payload,
		key: 'approval:approval-1',
	};
}

function renderApproval(payload: unknown) {
	return renderCard({ props: { event: hostEvent(payload) } });
}

function deferredDecision() {
	let resolve: (value: { ok: boolean }) => void = () => {};
	decideEasycodeApprovalMock.mockReturnValue(
		new Promise<{ ok: boolean }>((promiseResolve) => {
			resolve = promiseResolve;
		}),
	);
	return { resolve: (value: { ok: boolean }) => resolve(value) };
}

const API_CONTEXT = { baseUrl: '/rest', pushRef: 'push-ref' };

describe('EasycodeApprovalCard', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(BASE_TIME);
		decideEasycodeApprovalMock.mockReset().mockResolvedValue({ ok: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the title of the request kind, its details and the available decisions', async () => {
		const { getByTestId, getByText } = renderApproval(COMMAND_PAYLOAD);
		await flushPromises();

		expect(getByTestId('easycode-approval-card')).toBeInTheDocument();
		expect(getByText('Run a command')).toBeInTheDocument();
		expect(getByTestId('easycode-approval-reason')).toHaveTextContent(
			'The build needs the packages.',
		);
		expect(getByTestId('easycode-approval-detail')).toHaveTextContent('Install the dependencies');
		expect(getByTestId('easycode-approval-cwd')).toHaveTextContent('/work/project');
		expect(getByTestId('easycode-approval-command')).toHaveTextContent('npm install');
		expect(getByTestId('easycode-approval-accept')).toBeInTheDocument();
		expect(getByTestId('easycode-approval-decline')).toBeInTheDocument();
		expect(getByTestId('easycode-approval-acceptForSession')).toBeInTheDocument();
		expect(getByTestId('easycode-approval-countdown')).toHaveTextContent('Expires in 1:00');
	});

	it('counts down and replaces the choices with an unknown result after the deadline', async () => {
		const { getByTestId, queryByTestId } = renderApproval(COMMAND_PAYLOAD);
		await flushPromises();

		await vi.advanceTimersByTimeAsync(30_000);
		expect(getByTestId('easycode-approval-countdown')).toHaveTextContent('Expires in 0:30');

		await vi.advanceTimersByTimeAsync(31_000);
		expect(getByTestId('easycode-approval-status')).toHaveTextContent('Unknown result');
		expect(getByTestId('easycode-approval-status-description')).toHaveTextContent(
			'The approval expired before you decided.',
		);
		expect(getByTestId('easycode-approval-accept')).toBeDisabled();
		expect(queryByTestId('easycode-approval-countdown')).not.toBeInTheDocument();
	});

	it('sends the decision, shows it pending, then shows the result', async () => {
		const deferred = deferredDecision();
		const { getByTestId, getAllByText, queryByTestId } = renderApproval(COMMAND_PAYLOAD);
		await flushPromises();

		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(decideEasycodeApprovalMock).toHaveBeenCalledWith(API_CONTEXT, {
			agentId: 'easycode',
			threadId: 'thread-1',
			approvalId: 'approval-1',
			decision: 'accept',
		});
		expect(getByTestId('easycode-approval-status')).toHaveTextContent('Sending your decision…');
		expect(getByTestId('easycode-approval-accept')).toBeDisabled();

		deferred.resolve({ ok: true });
		await flushPromises();

		expect(getAllByText('Allowed').length).toBeGreaterThan(0);
		expect(queryByTestId('easycode-approval-accept')).not.toBeInTheDocument();
	});

	it('names a session approval in the resolved state', async () => {
		const { getByTestId, getAllByText } = renderApproval(COMMAND_PAYLOAD);
		await flushPromises();

		await fireEvent.click(getByTestId('easycode-approval-acceptForSession'));
		await flushPromises();

		expect(decideEasycodeApprovalMock).toHaveBeenCalledWith(API_CONTEXT, {
			agentId: 'easycode',
			threadId: 'thread-1',
			approvalId: 'approval-1',
			decision: 'acceptForSession',
		});
		expect(getAllByText('Allowed for this session').length).toBeGreaterThan(0);
	});

	it('shows that a conflict made the approval invalid', async () => {
		decideEasycodeApprovalMock.mockRejectedValue(
			new ResponseError('Already decided', { httpStatusCode: 409 }),
		);
		const { getByTestId } = renderApproval(COMMAND_PAYLOAD);
		await flushPromises();

		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(getByTestId('easycode-approval-status')).toHaveTextContent('No longer valid');
		expect(getByTestId('easycode-approval-status-description')).toHaveTextContent(
			'This approval was already decided or expired.',
		);
		expect(getByTestId('easycode-approval-accept')).toBeDisabled();
	});

	it('keeps the choices retryable after another failure', async () => {
		decideEasycodeApprovalMock
			.mockRejectedValueOnce(new ResponseError('Server error', { httpStatusCode: 500 }))
			.mockResolvedValueOnce({ ok: true });
		const { getByTestId } = renderApproval(COMMAND_PAYLOAD);
		await flushPromises();

		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(getByTestId('easycode-approval-status')).toHaveTextContent(
			"Couldn't send your decision",
		);
		expect(getByTestId('easycode-approval-accept')).not.toBeDisabled();

		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(decideEasycodeApprovalMock).toHaveBeenCalledTimes(2);
	});

	it('submits a chosen option as the answer of an input request', async () => {
		const { getByTestId, getByLabelText } = renderApproval({
			approvalId: 'approval-2',
			threadId: 'thread-2',
			requestKind: 'input',
			question: 'Which database?',
			options: ['Postgres', 'SQLite'],
			availableDecisions: ['accept', 'decline'],
		});
		await flushPromises();

		expect(getByTestId('easycode-approval-question')).toHaveTextContent('Which database?');
		await fireEvent.click(getByLabelText('Postgres'));
		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(decideEasycodeApprovalMock).toHaveBeenCalledWith(API_CONTEXT, {
			agentId: 'easycode',
			threadId: 'thread-2',
			approvalId: 'approval-2',
			decision: 'accept',
			answers: { '0': ['Postgres'] },
		});
	});

	it('submits free text as the answer of an input request', async () => {
		const { getByTestId } = renderApproval({
			approvalId: 'approval-2',
			threadId: 'thread-2',
			requestKind: 'input',
			question: 'Which database?',
			options: ['Postgres', 'SQLite'],
			availableDecisions: ['accept', 'decline'],
		});
		await flushPromises();

		await fireEvent.update(getByTestId('easycode-approval-answer'), 'DuckDB');
		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(decideEasycodeApprovalMock).toHaveBeenCalledWith(API_CONTEXT, {
			agentId: 'easycode',
			threadId: 'thread-2',
			approvalId: 'approval-2',
			decision: 'accept',
			answers: { '0': ['DuckDB'] },
		});
	});

	it('asks for an answer before it accepts an input request', async () => {
		const { getByTestId } = renderApproval({
			approvalId: 'approval-2',
			threadId: 'thread-2',
			requestKind: 'input',
			question: 'Which database?',
			availableDecisions: ['accept', 'decline'],
		});
		await flushPromises();

		await fireEvent.click(getByTestId('easycode-approval-accept'));
		await flushPromises();

		expect(decideEasycodeApprovalMock).not.toHaveBeenCalled();
		expect(getByTestId('easycode-approval-answer-error')).toHaveTextContent(
			'Choose an option or type an answer.',
		);
	});
});
