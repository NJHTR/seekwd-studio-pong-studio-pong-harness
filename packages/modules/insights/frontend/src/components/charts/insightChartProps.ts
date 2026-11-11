import type { InsightsByTime, InsightsSummaryType, InsightsDateRange } from '@pong/api-types';

export type ChartProps = {
	data: InsightsByTime[];
	type: InsightsSummaryType;
	granularity: InsightsDateRange['granularity'];
	startDate: string;
	endDate: string;
};
