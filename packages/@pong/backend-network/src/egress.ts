/**
 * Egress entry point (`@pong/backend-network/egress`).
 *
 * DI-free like `./transport`, but unlike it this subpath depends on
 * `pong-workflow` (types) and `@pong/utils`: it exposes the passthrough filter
 * singleton so DI-less consumers can detect "no egress policy configured" by
 * object identity.
 */
export { passthroughEgressFilter } from './ssrf/passthrough-egress-filter';
