#!/usr/bin/env zx
/**
 * Script to run benchmarks on the cloud benchmark environment.
 * This script will:
 * 	1. Provision a benchmark environment using Terraform.
 * 	2. Run the benchmarks on the VM.
 * 	3. Destroy the cloud environment.
 *
 * NOTE: Must be run in the root of the package.
 */
// @ts-check
import { $ } from 'zx';
import path from 'path';
import { flagsObjectToCliArgs } from './utils/flags.mjs';

/**
 * @typedef {Object} BenchmarkEnv
 * @property {string} vmName
 */

const paths = {
	scriptsDir: path.join(path.resolve('scripts')),
};

/**
 * @typedef {Object} Config
 * @property {boolean} isVerbose
 * @property {string[]} pongSetupsToUse
 * @property {string} pongTag
 * @property {string} benchmarkTag
 * @property {string} [runDir]
 * @property {string} [k6ApiToken]
 * @property {string} [resultWebhookUrl]
 * @property {string} [resultWebhookAuthHeader]
 * @property {string} [pongLicenseCert]
 * @property {string} [vus]
 * @property {string} [duration]
 * @property {string} [scenarioFilter]
 *
 * @param {Config} config
 */
export async function runLocally(config) {
	const runScriptPath = path.join(paths.scriptsDir, 'run-for-pong-setup.mjs');

	const cliArgs = flagsObjectToCliArgs({
		pongDockerTag: config.pongTag,
		benchmarkDockerTag: config.benchmarkTag,
		runDir: config.runDir,
		vus: config.vus,
		duration: config.duration,
		scenarioFilter: config.scenarioFilter,
		env: 'local',
	});

	try {
		for (const pongSetup of config.pongSetupsToUse) {
			console.log(`Running benchmarks for pong setup: ${pongSetup}`);

			await $({
				env: {
					...process.env,
					K6_API_TOKEN: config.k6ApiToken,
					BENCHMARK_RESULT_WEBHOOK_URL: config.resultWebhookUrl,
					BENCHMARK_RESULT_WEBHOOK_AUTH_HEADER: config.resultWebhookAuthHeader,
					PONG_LICENSE_CERT: config.pongLicenseCert,
				},
			})`npx ${runScriptPath} ${cliArgs} ${pongSetup}`;
		}
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error);
	}
}
