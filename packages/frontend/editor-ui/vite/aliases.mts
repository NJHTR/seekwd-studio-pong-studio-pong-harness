import { resolve } from 'path';
import type { Alias } from 'vite';

// `@pong/frontend-vite-config` holds the part that modules also use. Each module needs the same
// map for its own vitest run. A module must not import from the shell.
import { shellAliases } from '@pong/frontend-vite-config';

export const appAliases = (editorUiDir: string): Alias[] => [
	{ find: '@', replacement: resolve(editorUiDir, 'src') },
	// Stub out @pong/expression-runtime for browser build (it pulls in isolated-vm, a Node.js-only native module)
	{
		find: '@pong/expression-runtime',
		replacement: resolve(editorUiDir, 'vite/expression-runtime-stub.ts'),
	},
	{
		// For sanitize-html
		find: 'source-map-js',
		replacement: resolve(editorUiDir, 'vite/source-map-js-shim'),
	},
];

export const editorUiAliases = (editorUiDir: string, packagesDir: string): Alias[] => [
	// Allow direct import of the runtime IIFE bundle (for ?raw use in editor-ui).
	// Must precede the @pong/expression-runtime stub in appAliases, or the stub
	// (which matches the sub-path too) would intercept it. The regex preserves the
	// ?raw query suffix so rolldown treats the import as a raw string asset.
	{
		find: /^@pong\/expression-runtime\/runtime-bundle\.iife\.js(\?.*)?$/,
		replacement: `${resolve(packagesDir, '@pong', 'expression-runtime', 'dist', 'bundle', 'runtime.iife.js')}$1`,
	},
	...appAliases(editorUiDir),
	...shellAliases(packagesDir),
];
