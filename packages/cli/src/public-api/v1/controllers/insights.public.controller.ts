import { InsightsSummaryPublicDto, InsightsSummaryQueryPublicDto } from '@pong/api-types';
import type { AuthenticatedRequest } from '@pong/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	PublicApiController,
	Query,
} from '@pong/decorators';
import type { Response } from 'express';
import { DateTime } from 'luxon';

import { BadRequestError, ForbiddenError, UserError } from '@pong/errors';
import { InsightsService } from '@pong/backend-module-insights';

@PublicApiController('/insights')
export class InsightsPublicController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@ApiKeyScope('insights:read')
	@ApiSummary('Retrieve insights summary')
	@ApiDescription('Retrieve the insights summary for the selected date range.')
	@ApiTags(['Insights'])
	@ApiResponse(200, InsightsSummaryPublicDto)
	async getInsightsSummary(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: InsightsSummaryQueryPublicDto,
	): Promise<InsightsSummaryPublicDto> {
		const endDate = query.endDate ? new Date(query.endDate) : new Date();
		const startDate = query.startDate
			? new Date(query.startDate)
			: DateTime.now().minus({ days: 7 }).toJSDate();

		if (query.startDate && query.endDate && startDate > endDate) {
			throw new BadRequestError('endDate must be the same as or after startDate');
		}

		try {
			this.insightsService.validateDateFiltersLicense({ startDate, endDate });
		} catch (error) {
			if (error instanceof UserError) {
				throw new ForbiddenError(error.message);
			}

			throw error;
		}

		return await this.insightsService.getInsightsSummary({
			user: req.user,
			startDate,
			endDate,
			projectId: query.projectId,
		});
	}
}
