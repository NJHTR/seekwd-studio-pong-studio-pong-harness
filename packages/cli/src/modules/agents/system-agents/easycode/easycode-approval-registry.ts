import type { EasycodeApprovalBridge } from './approval-bridge';
import { Service } from '@pong/di';

/**
 * The approval bridges of the sessions that currently run an easyCode turn.
 *
 * The chat controller answers an approval by thread id; the provider registers
 * the bridge of a turn before it starts and removes it when the turn settles.
 * One thread runs one turn at a time, so a thread has at most one bridge.
 */
@Service()
export class EasycodeApprovalRegistry {
	private readonly bridges = new Map<string, EasycodeApprovalBridge>();

	register(threadId: string, bridge: EasycodeApprovalBridge): void {
		this.bridges.set(threadId, bridge);
	}

	/** Remove the bridge, but only when it is still the registered one. */
	unregister(threadId: string, bridge: EasycodeApprovalBridge): void {
		if (this.bridges.get(threadId) === bridge) this.bridges.delete(threadId);
	}

	find(threadId: string): EasycodeApprovalBridge | undefined {
		return this.bridges.get(threadId);
	}
}
