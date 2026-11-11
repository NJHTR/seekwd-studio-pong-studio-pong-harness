import type { User } from '@pong/db';
import { Service } from '@pong/di';

import { PongMemory } from '../integrations/pong-memory';
import { SystemAgentExecutionService } from './system-agent-execution.service';

/**
 * Reads and changes one key of the metadata of a system agent thread, for the
 * module that owns the agent and its keys. Each call runs the access checks of
 * the thread routes: thread ownership, `project:read` on the working project,
 * and the checks of the provider.
 *
 * A thread gets its metadata with its first turn. Before then, a read returns
 * `undefined` and an update does nothing.
 */
@Service()
export class SystemAgentThreadMetadataService {
	constructor(
		private readonly systemAgents: SystemAgentExecutionService,
		private readonly pongMemory: PongMemory,
	) {}

	/** The value of `key` in the thread metadata, or `undefined` when it is not set. */
	async read(agentId: string, user: User, threadId: string, key: string): Promise<unknown> {
		await this.systemAgents.getUsableThread(agentId, user, threadId);
		const thread = await this.pongMemory.getImplementation(agentId).getThread(threadId);
		return thread?.metadata?.[key];
	}

	/**
	 * Change `key` on the locked thread row. The other keys stay. `change` gets
	 * the current value, and returns the new value, or `undefined` to write nothing.
	 */
	async update(
		agentId: string,
		user: User,
		threadId: string,
		key: string,
		change: (current: unknown) => unknown,
	): Promise<void> {
		await this.systemAgents.getUsableThread(agentId, user, threadId);
		await this.pongMemory.getImplementation(agentId).patchThread({
			threadId,
			update: ({ metadata }) => {
				const next = change(metadata?.[key]);
				if (next === undefined) return null;
				return { metadata: { ...metadata, [key]: next } };
			},
		});
	}
}
