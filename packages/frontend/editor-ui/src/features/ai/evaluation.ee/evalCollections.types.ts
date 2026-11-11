// Re-exports from @pong/api-types so eval-collections FE callers don't reach
// across packages. New shared type? Export it from `@pong/api-types` first.

export type {
	AddRunToCollectionPayload,
	AiInsightsPayload,
	AiInsightsRegression,
	AiInsightsResponse,
	AiInsightsStatus,
	AiInsightsSuggestedNext,
	AiInsightsWinner,
	CreateEvaluationCollectionPayload,
	EvalCollectionRunStatus,
	EvalCollectionVersionEntry,
	EvalVersionEntry,
	EvalVersionsResponse,
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	EvaluationCollectionRunSummary,
	GenerateInsightsPayload,
	MetricScale,
	UpdateEvaluationCollectionPayload,
} from '@pong/api-types';

export type { CreateCollectionResponse } from './evalCollections.api';
