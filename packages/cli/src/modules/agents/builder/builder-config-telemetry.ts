import type { TelemetryEventDef } from '@pong/telemetry';
import type { GenericValue } from 'pong-workflow';

export type BuilderTrackFn = (
	entry: TelemetryEventDef,
	properties: Record<string, GenericValue>,
) => void;
