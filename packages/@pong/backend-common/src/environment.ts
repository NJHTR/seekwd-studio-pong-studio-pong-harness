const { NODE_ENV } = process.env;

export const inTest = NODE_ENV === 'test';
export const inProduction = NODE_ENV === 'production';
export const inDevelopment = !NODE_ENV || NODE_ENV === 'development';

type EnvFeatureFlag = `PONG_ENV_FEAT_${Uppercase<string>}`;

/**
 * Whether the given `PONG_ENV_FEAT_` env var is set to `'true'`.
 *
 * Takes the full env var name, so each flag stays greppable at its call sites.
 * Stays a function because tests and the e2e controller change these vars at
 * runtime.
 */
export function isEnvFeatureEnabled(envVar: EnvFeatureFlag): boolean {
	return process.env[envVar] === 'true';
}
