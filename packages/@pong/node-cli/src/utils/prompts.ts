import { cancel, isCancel, log } from '@clack/prompts';
import fs from 'node:fs/promises';
import path from 'node:path';
import picocolors from 'picocolors';

import { jsonParse } from './json';
import { isPongNodePackage } from './package';

export async function withCancelHandler<T>(prompt: Promise<symbol | T>): Promise<T> {
	const result = await prompt;
	if (isCancel(result)) return onCancel();
	return result;
}

export const onCancel = (message = 'Cancelled', code = 0) => {
	cancel(message);
	process.exit(code);
};

export async function ensurePongPackage(commandName: string) {
	const isPongNode = await isPongNodePackage();
	if (!isPongNode) {
		log.error(`Make sure you are in the root directory of your node package and your package.json contains the "pong" field

For example:
{
	"name": "pong-nodes-my-app",
	"version": "0.1.0",
	"pong": {
		"nodes": ["dist/nodes/MyApp.node.js"]
	}
}
`);
		onCancel(`${commandName} can only be run in an pong node package`, 1);
		process.exit(1);
	}
}

async function getCliVersion(): Promise<string> {
	try {
		const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf-8');
		const packageJson = jsonParse<{ version: string }>(content);
		return packageJson?.version ?? 'unknown';
	} catch {
		return 'unknown';
	}
}

export async function getCommandHeader(commandName: string): Promise<string> {
	const version = await getCliVersion();
	return `${picocolors.inverse(` ${commandName} `)} ${picocolors.dim(`v${version}`)}`;
}

export async function printCommandHeader(commandName: string): Promise<void> {
	const header = await getCommandHeader(commandName);
	process.stdout.write(`${header}\n\n`);
}
