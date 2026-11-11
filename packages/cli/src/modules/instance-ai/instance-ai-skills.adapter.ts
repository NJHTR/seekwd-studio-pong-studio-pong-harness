import { CreateSkillDto, ListSkillsQueryDto, SaveSkillDto } from '@pong/api-types';
import type { User } from '@pong/db';
import { Service } from '@pong/di';
import type { InstanceAiSkillService } from '@pong/instance-ai';
import { UserError } from '@pong/errors';

import { SkillService, toSkillToolRefusal } from '@/modules/skills';

const STALE_SKILL_TOOL_MESSAGE =
	'The skill changed since you read it, so nothing was saved. Read it again with the get action and retry with its new skillHash.';

@Service()
export class InstanceAiSkillsAdapterService {
	constructor(private readonly skillService: SkillService) {}

	createService(user: User, assistantSkillsEnabled: boolean): InstanceAiSkillService {
		return {
			assistantSkillsEnabled,
			list: async ({ query, scope, projectId, attachableToAgentId, limit, skip }) =>
				await this.skillService.list(
					user,
					ListSkillsQueryDto.parse({
						search: query,
						scope,
						projectId,
						attachableTo: attachableToAgentId,
						take: String(limit),
						skip: String(skip),
					}),
				),
			get: async (skillId) => await this.skillService.get(user, skillId),
			create: async (input) => {
				try {
					return await this.skillService.create(user, CreateSkillDto.parse(input), 'assistant');
				} catch (error) {
					const refusal = await toSkillToolRefusal(error);
					if (refusal?.code === 'skill_name_taken') throw new UserError(refusal.message);
					throw error;
				}
			},
			update: async (skillId, input) => {
				try {
					return await this.skillService.update(
						user,
						skillId,
						SaveSkillDto.parse(input),
						'assistant',
					);
				} catch (error) {
					const refusal = await toSkillToolRefusal(error, {
						baseSkillHash: input.baseSkillHash,
						currentHash: async () => (await this.skillService.get(user, skillId)).skillHash,
					});
					if (!refusal) throw error;
					throw new UserError(
						refusal.code === 'stale_skill' ? STALE_SKILL_TOOL_MESSAGE : refusal.message,
					);
				}
			},
			delete: async (skillId) => await this.skillService.delete(user, skillId, 'assistant'),
		};
	}
}
