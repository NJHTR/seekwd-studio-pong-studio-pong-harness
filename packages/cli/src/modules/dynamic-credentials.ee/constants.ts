/**
 * Stable, well-known id of the system-managed PONG self-connect credential resolver
 * seeded by `PongResolverSeeder` during module init. Downstream tickets (IAM-660 etc.)
 * reference this id from workflow settings and OAuth callbacks.
 *
 * Re-exported from `@pong/api-types` so the frontend and backend share a single source.
 */
export { SYSTEM_RESOLVER_ID } from '@pong/api-types';

/**
 * Human-readable name persisted on the seeded row and shown in the workflow-settings
 * resolver dropdown (where this is the default selection). Hidden from the admin
 * resolver list / types endpoints.
 */
export const SYSTEM_RESOLVER_NAME = 'pong private credentials';

/** Type name of the PONG self-connect resolver class (matches its `metadata.name`). */
export const SYSTEM_RESOLVER_TYPE = 'credential-resolver.pong-1.0';
