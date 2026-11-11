import { ListAgentsQueryDto, ListPongChatThreadsQueryDto } from '@pong/api-types';
import type { AuthenticatedRequest } from '@pong/db';
import { Get, Param, Query, RestController } from '@pong/decorators';
import { NotFoundError } from '@pong/errors';
import type { Response } from 'express';

import { AgentsService } from './agents.service';
import { parseThreadListLimit } from './utils/parse-thread-list-limit';

/**
 * Global (cross-project) agents list endpoint.
 *
 * It serves two audiences, and `availableInChat` picks between them:
 * - the overview page, which wants every agent in the projects where the user
 *   holds `agent:list` and the full entity to render its cards;
 * - the pong chat page, which wants the agents whose published config carries
 *   the pong Chat channel, scoped to `agent:execute` and answered with the
 *   narrow `AgentChatListItem` so a chat-only member gets no config.
 *
 * They differ in scope and in response shape, so each has its own service
 * method and this route only dispatches. The route carries no project in its
 * URL, so it takes no `@ProjectScope` decorator; `AgentsService` enforces the
 * per-project scope instead, the same reasoning as `AgentMcpAccessController`.
 */
@RestController('/agents/v2')
export class AgentsListController {
	constructor(private readonly agentsService: AgentsService) {}

	@Get('/')
	async list(req: AuthenticatedRequest, res: Response, @Query query: ListAgentsQueryDto) {
		res.json(
			query.filter?.availableInChat === undefined
				? await this.agentsService.findListableByUserPaginated(req.user, query)
				: await this.agentsService.findChatReachableByUserPaginated(req.user, query),
		);
	}

	/**
	 * One agent as the pong Chat page needs it: a chat-only member holds
	 * `agent:execute` but not `agent:read`, so they cannot call the regular
	 * agent-by-id route to get its name and avatar for a direct link or a
	 * reload. 404s when the agent doesn't exist, isn't reachable by this user,
	 * or isn't published to pong Chat — same response for all three, so the
	 * chat-only member learns nothing about agents they cannot reach.
	 */
	@Get('/pong-chat/agents/:agentId')
	async getChatAgent(req: AuthenticatedRequest, _res: Response, @Param('agentId') agentId: string) {
		const agent = await this.agentsService.findChatReachableAgentForUser(agentId, req.user);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	/** The user's own pong Chat threads across every agent they can reach, for
	 *  the chat page's cross-agent "recent chats" list. */
	@Get('/pong-chat/threads')
	async listPongChatThreads(
		req: AuthenticatedRequest,
		res: Response,
		@Query query: ListPongChatThreadsQueryDto,
	) {
		const limit = parseThreadListLimit(query.limit);
		res.json(
			await this.agentsService.findPongChatThreadsForUser(req.user, {
				limit,
				cursor: query.cursor,
				agentId: query.agentId,
				search: query.search,
			}),
		);
	}

	/**
	 * One of the user's own pong Chat threads, for the chat page to read a
	 * thread's title when it falls outside the recent-threads page (e.g. after
	 * a reload on an older thread). 404s when the thread doesn't exist, isn't
	 * owned by this user, or its agent isn't reachable over pong Chat anymore —
	 * same response for all three, same scoping as the list route.
	 */
	@Get('/pong-chat/threads/:threadId')
	async getPongChatThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	) {
		const thread = await this.agentsService.findPongChatThreadForUser(req.user, threadId);
		if (!thread) throw new NotFoundError(`Thread "${threadId}" not found`);
		return thread;
	}
}
