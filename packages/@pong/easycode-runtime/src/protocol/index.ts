/**
 * Whitelisted subset of the easyCode app-server protocol.
 *
 * Source: `easycode app-server generate-ts` from the locked binary (748 files,
 * 652 of them in `v2/`). This package copies only the types that pong consumes
 * in M0. `scripts/schema-diff.mjs` regenerates the bindings and checks the
 * whitelist, so upstream drift is visible in CI.
 */

export type * from './approvals';
export type * from './dynamic-tools';
export * from './envelopes';
export type * from './initialize';
export type * from './json';
export * from './methods';
export * from './parsers';
export type * from './thread';
export type * from './turn';
