// Shared by post-start.mjs (installs at container start) and scripts/cloud-session.mjs
// (re-installs in the session prelude). Both must agree or a session boots with a
// partial skill set.
export const MARKETPLACE = 'pong-io/pong-agent-skills';
export const PLUGINS = ['quality@pong-agent-skills', 'security@pong-agent-skills'];
