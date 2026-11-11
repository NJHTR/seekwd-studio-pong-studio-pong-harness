import type { InstanceReportingStatus } from '@pong/api-types';
import { Get, RestController } from '@pong/decorators';

import { InstanceMonitoringReportRepository } from './database/repositories/instance-monitoring-report.repository';

@RestController('/instance-reporting')
export class InstanceReportingController {
	constructor(private readonly reportRepository: InstanceMonitoringReportRepository) {}

	@Get('/status')
	async getStatus(): Promise<InstanceReportingStatus> {
		const lastDelivery = await this.reportRepository.findLastDeliveryTime();

		return { lastSuccessfulReport: lastDelivery?.toISOString() ?? null };
	}
}
