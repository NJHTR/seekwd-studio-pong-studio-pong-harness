import fs from 'node:fs/promises';
import path from 'node:path';
import prettier from 'prettier';

import { writeFileSafe } from './filesystem';
import { jsonParse } from './json';

export type PongPackageJson = {
	name: string;
	version: string;
	pong?: {
		nodes?: string[];
		credentials?: string[];
		strict?: boolean;
	};
};

export async function updatePackageJson(
	dirPath: string,
	updater: (packageJson: PongPackageJson) => PongPackageJson,
) {
	const packageJsonPath = path.resolve(dirPath, 'package.json');
	const packageJson = jsonParse<PongPackageJson>(await fs.readFile(packageJsonPath, 'utf-8'));

	if (!packageJson) return;

	const updatedPackageJson = updater(packageJson);

	await writeFileSafe(
		packageJsonPath,
		await prettier.format(JSON.stringify(updatedPackageJson), { parser: 'json' }),
	);
}

export async function getPackageJson(dirPath: string) {
	const packageJsonPath = path.resolve(dirPath, 'package.json');
	const packageJson = jsonParse<PongPackageJson>(await fs.readFile(packageJsonPath, 'utf-8'));

	return packageJson;
}

export async function isPongNodePackage(dirPath = process.cwd()) {
	const packageJson = await getPackageJson(dirPath).catch(() => null);

	return Array.isArray(packageJson?.pong?.nodes);
}

export async function getPackageJsonNodes(dirPath: string) {
	const packageJson = await getPackageJson(dirPath);
	return packageJson?.pong?.nodes ?? [];
}

export async function setNodesPackageJson(dirPath: string, nodes: string[]) {
	await updatePackageJson(dirPath, (packageJson) => {
		packageJson['pong'] ??= {};
		packageJson['pong'].nodes = nodes;
		return packageJson;
	});
}

export async function addCredentialPackageJson(dirPath: string, credential: string) {
	await updatePackageJson(dirPath, (packageJson) => {
		packageJson['pong'] ??= {};
		packageJson['pong'].credentials ??= [];
		packageJson['pong'].credentials.push(credential);
		return packageJson;
	});
}
