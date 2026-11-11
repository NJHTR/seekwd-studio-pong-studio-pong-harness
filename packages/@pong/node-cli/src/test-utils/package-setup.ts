import fs from 'node:fs/promises';

import type { PongPackageJson } from '../utils/package';

export interface PackageSetupOptions {
	packageJson?: Partial<PongPackageJson>;
	eslintConfig?: string | boolean;
}

const DEFAULT_PACKAGE_CONFIG: PongPackageJson = {
	name: 'test-node',
	version: '1.0.0',
	pong: {
		nodes: ['dist/nodes/TestNode.node.js'],
		strict: true,
	},
};

const DEFAULT_ESLINT_CONFIG =
	"import { config } from '@pong/node-cli/eslint';\n\nexport default config;\n";

export async function setupTestPackage(
	tmpdir: string,
	options: PackageSetupOptions = {},
): Promise<void> {
	const packageConfig = {
		...DEFAULT_PACKAGE_CONFIG,
		...options.packageJson,
		pong: {
			...DEFAULT_PACKAGE_CONFIG.pong,
			...options.packageJson?.pong,
		},
	};
	await fs.writeFile(`${tmpdir}/package.json`, JSON.stringify(packageConfig, null, 2));

	if (options.eslintConfig === true) {
		await fs.writeFile(`${tmpdir}/eslint.config.mjs`, DEFAULT_ESLINT_CONFIG);
	} else if (typeof options.eslintConfig === 'string') {
		await fs.writeFile(`${tmpdir}/eslint.config.mjs`, options.eslintConfig);
	}
}
