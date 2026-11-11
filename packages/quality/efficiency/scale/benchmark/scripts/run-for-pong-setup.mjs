#!/usr/bin/env zx
/**
 * This script runs the benchmarks for the given pong setup.
 */
// @ts-check
import path from 'path';
import { $, argv, fs } from 'zx';
import { DockerComposeClient } from './clients/docker-compose-client.mjs';
import { flagsObjectToCliArgs } from './utils/flags.mjs';
import { EOL } from 'os';

const paths = {
	pongSetupsDir: path.join(__dirname, 'pong-setups'),
	mockApiDataPath: path.join(__dirname, 'mock-api'),
};

const PONG_ENCRYPTION_KEY = 'very-secret-encryption-key';

/**
 * Discovers runner services in the docker-compose setup, where the name matches exactly `runners` or ends with `_runners`
 */
async function discoverRunnerServices(dockerComposeClient) {
	const result = await dockerComposeClient.$('config', '--services');

	return result.stdout
		.trim()
		.split(EOL)
		.filter((service) => service === 'runners' || service.endsWith('_runners'));
}

async function main() {
	const [pongSetupToUse] = argv._;
	validatePongSetup(pongSetupToUse);

	const composeFilePath = path.join(paths.pongSetupsDir, pongSetupToUse);
	const setupScriptPath = path.join(paths.pongSetupsDir, pongSetupToUse, 'setup.mjs');
	const pongTag = argv.pongDockerTag || process.env.PONG_DOCKER_TAG || 'latest';
	const benchmarkTag = argv.benchmarkDockerTag || process.env.BENCHMARK_DOCKER_TAG || 'latest';
	const k6ApiToken = argv.k6ApiToken || process.env.K6_API_TOKEN || undefined;
	const resultWebhookUrl =
		argv.resultWebhookUrl || process.env.BENCHMARK_RESULT_WEBHOOK_URL || undefined;
	const resultWebhookAuthHeader =
		argv.resultWebhookAuthHeader || process.env.BENCHMARK_RESULT_WEBHOOK_AUTH_HEADER || undefined;
	const baseRunDir = argv.runDir || process.env.RUN_DIR || '/pong';
	const pongLicenseCert = argv.pongLicenseCert || process.env.PONG_LICENSE_CERT || undefined;
	const pongLicenseActivationKey = process.env.PONG_LICENSE_ACTIVATION_KEY || undefined;
	const pongLicenseTenantId = argv.pongLicenseTenantId || process.env.PONG_LICENSE_TENANT_ID || '1';
	const envTag = argv.env || 'local';
	const vus = argv.vus;
	const duration = argv.duration;
	const scenarioFilter = argv.scenarioFilter;

	const hasPongLicense = !!pongLicenseCert || !!pongLicenseActivationKey;
	if (pongSetupToUse === 'scaling-multi-main' && !hasPongLicense) {
		console.error(
			'pong license is required to run the multi-main scaling setup. Please provide PONG_LICENSE_CERT or PONG_LICENSE_ACTIVATION_KEY (and PONG_LICENSE_TENANT_ID if needed)',
		);
		process.exit(1);
	}

	if (!fs.existsSync(baseRunDir)) {
		console.error(
			`The run directory "${baseRunDir}" does not exist. Please specify a valid directory using --runDir`,
		);
		process.exit(1);
	}

	const runDir = path.join(baseRunDir, pongSetupToUse);
	fs.emptyDirSync(runDir);

	const dockerComposeClient = new DockerComposeClient({
		$: $({
			cwd: composeFilePath,
			verbose: true,
			env: {
				PATH: process.env.PATH,
				PONG_VERSION: pongTag,
				PONG_LICENSE_CERT: pongLicenseCert,
				PONG_LICENSE_ACTIVATION_KEY: pongLicenseActivationKey,
				PONG_LICENSE_TENANT_ID: pongLicenseTenantId,
				PONG_ENCRYPTION_KEY,
				PONG_BENCHMARK_VERSION: benchmarkTag,
				K6_API_TOKEN: k6ApiToken,
				BENCHMARK_RESULT_WEBHOOK_URL: resultWebhookUrl,
				BENCHMARK_RESULT_WEBHOOK_AUTH_HEADER: resultWebhookAuthHeader,
				RUN_DIR: runDir,
				MOCK_API_DATA_PATH: paths.mockApiDataPath,
			},
		}),
	});

	// Run the setup script if it exists
	if (fs.existsSync(setupScriptPath)) {
		const setupScript = await import(setupScriptPath);
		await setupScript.setup({ runDir });
	}

	try {
		const runnerServices = await discoverRunnerServices(dockerComposeClient);
		await dockerComposeClient.$('up', '-d', '--remove-orphans', 'pong', ...runnerServices);

		const tags = Object.entries({
			Env: envTag,
			PongVersion: pongTag,
			PongSetup: pongSetupToUse,
		})
			.map(([key, value]) => `${key}=${value}`)
			.join(',');

		const cliArgs = flagsObjectToCliArgs({
			scenarioNamePrefix: pongSetupToUse,
			scenarioFilter,
			vus,
			duration,
			tags,
		});

		await dockerComposeClient.$('run', 'benchmark', 'run', ...cliArgs);
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error.message);
		console.error('');
		await printContainerStatus(dockerComposeClient);
		throw error;
	} finally {
		await dumpLogs(dockerComposeClient);
		await dockerComposeClient.$('down');
	}
}

async function printContainerStatus(dockerComposeClient) {
	console.error('Container statuses:');
	await dockerComposeClient.$('ps', '-a');
}

async function dumpLogs(dockerComposeClient) {
	console.info('Container logs:');
	await dockerComposeClient.$('logs');
}

function printUsage() {
	const availableSetups = getAllPongSetups();
	console.log('Usage: zx runForPongSetup.mjs --runDir /path/for/pong/data <pong setup to use>');
	console.log(`   eg: zx runForPongSetup.mjs --runDir /path/for/pong/data ${availableSetups[0]}`);
	console.log('');
	console.log('Flags:');
	console.log(
		'  --runDir <path>             Directory to share with the pong container for storing data. Default is /pong',
	);
	console.log('  --pongDockerTag <tag>        Docker tag for pong image. Default is latest');
	console.log(
		'  --benchmarkDockerTag <tag>  Docker tag for benchmark cli image. Default is latest',
	);
	console.log('  --k6ApiToken <token>        K6 API token to upload the results');
	console.log('');
	console.log('Available setups:');
	console.log(availableSetups.join(', '));
}

/**
 * @returns {string[]}
 */
function getAllPongSetups() {
	return fs.readdirSync(paths.pongSetupsDir);
}

function validatePongSetup(givenSetup) {
	const availableSetups = getAllPongSetups();
	if (!availableSetups.includes(givenSetup)) {
		printUsage();
		process.exit(1);
	}
}

main();
