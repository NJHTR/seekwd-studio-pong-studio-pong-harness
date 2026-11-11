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
import { sleep, which, $, tmpdir } from 'zx';
import path from 'path';
import { SshClient } from './clients/ssh-client.mjs';
import { TerraformClient } from './clients/terraform-client.mjs';
import { flagsObjectToCliArgs } from './utils/flags.mjs';

/**
 * @typedef {Object} BenchmarkEnv
 * @property {string} vmName
 * @property {string} ip
 * @property {string} sshUsername
 * @property {string} sshPrivateKeyPath
 */

/**
 * @typedef {Object} Config
 * @property {boolean} isVerbose
 * @property {string[]} pongSetupsToUse
 * @property {string} pongTag
 * @property {string} benchmarkTag
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
export async function runInCloud(config) {
	await ensureDependencies();

	const terraformClient = new TerraformClient({
		isVerbose: config.isVerbose,
	});

	const benchmarkEnv = await terraformClient.getTerraformOutputs();

	await runBenchmarksOnVm(config, benchmarkEnv);
}

async function ensureDependencies() {
	await which('terraform');
	await which('az');
}

/**
 * @param {Config} config
 * @param {BenchmarkEnv} benchmarkEnv
 */
async function runBenchmarksOnVm(config, benchmarkEnv) {
	console.log(`Setting up the environment...`);

	const sshClient = new SshClient({
		ip: benchmarkEnv.ip,
		username: benchmarkEnv.sshUsername,
		privateKeyPath: benchmarkEnv.sshPrivateKeyPath,
		verbose: config.isVerbose,
	});

	await ensureVmIsReachable(sshClient);

	const scriptsDir = await transferScriptsToVm(sshClient, config);

	// Bootstrap the environment with dependencies
	console.log('Running bootstrap script...');
	const bootstrapScriptPath = path.join(scriptsDir, 'bootstrap.sh');
	await sshClient.ssh(`chmod a+x ${bootstrapScriptPath} && ${bootstrapScriptPath}`);

	// Give some time for the VM to be ready
	await sleep(1000);

	const failures = [];

	for (const pongSetup of config.pongSetupsToUse) {
		try {
			await runBenchmarkForPongSetup({
				config,
				sshClient,
				scriptsDir,
				pongSetup,
			});
		} catch (error) {
			console.error(`Benchmark failed for ${pongSetup}:`, error.message);
			failures.push(pongSetup);
		}
	}

	if (failures.length > 0) {
		throw new Error(`Benchmarks failed for setups: ${failures.join(', ')}`);
	}
}

/**
 * @param {{ config: Config; sshClient: any; scriptsDir: string; pongSetup: string; }} opts
 */
async function runBenchmarkForPongSetup({ config, sshClient, scriptsDir, pongSetup }) {
	console.log(`Running benchmarks for ${pongSetup}...`);
	const runScriptPath = path.join(scriptsDir, 'run-for-pong-setup.mjs');

	const cliArgs = flagsObjectToCliArgs({
		pongDockerTag: config.pongTag,
		benchmarkDockerTag: config.benchmarkTag,
		k6ApiToken: config.k6ApiToken,
		resultWebhookUrl: config.resultWebhookUrl,
		resultWebhookAuthHeader: config.resultWebhookAuthHeader,
		pongLicenseCert: config.pongLicenseCert,
		scenarioFilter: config.scenarioFilter,
		vus: config.vus,
		duration: config.duration,
		env: 'cloud',
	});

	const flagsString = cliArgs.join(' ');

	await sshClient.ssh(`npx zx ${runScriptPath} ${flagsString} ${pongSetup}`, {
		// Test run should always log its output
		verbose: true,
	});
}

async function ensureVmIsReachable(sshClient) {
	try {
		await sshClient.ssh('echo "VM is reachable"');
	} catch (error) {
		console.error(`VM is not reachable: ${error.message}`);
		console.error(
			`Did you provision the cloud environment first with 'pnpm provision-cloud-env'? You can also run the benchmarks locally with 'pnpm run benchmark-locally'.`,
		);
		process.exit(1);
	}
}

/**
 * @returns Path where the scripts are located on the VM
 */
async function transferScriptsToVm(sshClient, config) {
	const cwd = process.cwd();
	const scriptsDir = path.resolve(cwd, './scripts');
	const tarFilename = 'scripts.tar.gz';
	const scriptsTarPath = path.join(tmpdir('pong-benchmark'), tarFilename);

	// COPYFILE_DISABLE stops macOS tar from adding `._*` AppleDouble files, which
	// WireMock fails to load as mappings
	const $$ = $({ verbose: config.isVerbose, env: { ...process.env, COPYFILE_DISABLE: '1' } });

	// Compress the scripts folder
	await $$`tar -czf ${scriptsTarPath} ${scriptsDir} -C ${cwd} ./scripts`;

	// Transfer the scripts to the VM
	await sshClient.scp(scriptsTarPath, `~/${tarFilename}`);

	// Extract the scripts on the VM
	await sshClient.ssh(`tar -xzf ~/${tarFilename}`);

	return '~/scripts';
}
