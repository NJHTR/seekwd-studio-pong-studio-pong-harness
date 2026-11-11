import { safeJoinPath } from '@pong/backend-common';
import { BUILTIN_NODES_PACKAGES } from '@pong/constants';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Resolve the built-in node definition directories from installed node packages.
 */
export function resolveBuiltinNodeDefinitionDirs(): string[] {
	const dirs: string[] = [];
	for (const packageId of BUILTIN_NODES_PACKAGES) {
		try {
			const packageJsonPath = require.resolve(`${packageId}/package.json`);
			const distDir = dirname(packageJsonPath);
			const nodeDefsDir = safeJoinPath(distDir, 'dist', 'node-definitions');
			if (existsSync(nodeDefsDir)) {
				dirs.push(nodeDefsDir);
			}
		} catch {
			// Package not installed, skip
		}
	}
	return dirs;
}
