import tseslint from 'typescript-eslint';

/**
 * Backend network boundary.
 *
 * Backend outbound HTTP must go through the `@pong/backend-network` factory so
 * SSRF/DNS guarding and proxy handling stay centrally controlled. This turns on
 * `pong-local-rules/no-uncentralized-http` for every Node backend package (it is
 * part of `backendConfig`).
 *
 * Out of natural scope:
 * - Frontend packages (they use `frontendConfig`, not `backendConfig`)
 *
 * Note that only the `Agent` class is restricted from `node:http`/`node:https`,
 * so a package that starts a server with `createServer` needs nothing here.
 *
 * Prefer an inline `// eslint-disable-next-line ... -- <reason>` for a single
 * callsite. Use the lists below only for whole-path scope exclusions or tracked
 * migration debt. See `packages/@pong/backend-network/README.md`.
 */
export const backendNetworkBoundaryConfig = tseslint.config({
	rules: {
		'pong-local-rules/no-uncentralized-http': [
			'error',
			{
				allow: [
					// The factory itself: this is where the guarded client is built.
					'packages/@pong/backend-network/',
					'packages/quality/efficiency/scale/benchmark/',
				],
			},
		],
	},
});
