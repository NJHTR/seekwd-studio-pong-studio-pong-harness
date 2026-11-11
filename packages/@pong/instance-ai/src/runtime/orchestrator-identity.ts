/**
 * Per-run orchestrator agent id, derived from the run's cryptographic id.
 * Deterministic so every emitter and recovery path agrees without persisting a
 * separate field; unique across runs, stable within a run. The run reducer in
 * `@pong/api-types` owns the format, because it resolves follow-up runs by it.
 */
export { orchestratorAgentId } from '@pong/api-types';
