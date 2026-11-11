import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Forces pong workspace packages to load from their built `dist/` and marks them
 * external (loaded via Node's require, so a single instance is shared).
 *
 * Why this is needed: pnpm symlinks workspace packages into `node_modules`, but
 * they resolve to their real path under `packages/`, which does NOT match
 * Vitest's default `/node_modules/` external rule — so Vitest *inlines* them and
 * Vite transforms their `src` (picked via the `module` field). That source tree
 * includes TypeORM entities whose `emitDecoratorMetadata`/type-only imports oxc
 * mishandles, and loading each workspace package as both Vite-transformed source
 * and Node-required dist produces two `@pong/di` Containers. Resolving them to
 * `dist` via Node (`require.resolve`, which ignores the `module` field) and
 * externalizing fixes both.
 */
export function workspaceDistExternals(): Plugin {
	const projectDir = process.cwd();
	const req = createRequire(path.join(projectDir, 'index.js'));

	const EXCLUDE = new Set(['@pong/backend-test-utils', '@pong/mcp-apps/server']);
	const PONG_PREFIXES = ['pong-workflow', 'pong-core', 'pong-nodes-base', 'pong-editor-ui'];

	const isWorkspacePkg = (source: string) => {
		if (EXCLUDE.has(source)) return false;
		if (source.startsWith('@pong/')) return true;
		// `zod` is externalized so a single instance is shared with the externalized
		// workspace packages (e.g. `@pong/api-types` schemas); otherwise a
		// Vite-inlined `zod` and the dist `zod` produce distinct `ZodError`
		// classes and `instanceof` checks fail across the boundary.
		if (source === 'zod' || source.startsWith('zod/')) return true;
		// `ws` is a CJS module whose `Server`/`WebSocket` constructors are lost when
		// Vitest inlines it through ESM interop (`new Server()` -> "not a constructor").
		// Externalizing loads it via Node's require, preserving the constructors.
		if (source === 'ws') return true;
		return PONG_PREFIXES.some((name) => source === name || source.startsWith(`${name}/`));
	};

	return {
		name: 'workspace-dist-externals',
		enforce: 'pre',
		resolveId(source) {
			if (!isWorkspacePkg(source)) return null;
			try {
				let id = req.resolve(source);
				// `pong-nodes-base` has no `exports` map, so a deep import like
				// `pong-nodes-base/nodes/X/X.node` resolves against the source tree, where
				// the class (`X.node.ts`) is invisible to Node's resolver and only the
				// sibling `X.node.json` metadata file is pickable — yielding a module with
				// no class export (`new X()` -> "not a constructor"). Redirect such
				// `.node`/`.credentials` imports to the compiled `dist/` copy, where the
				// `.js` wins over the `.json` sibling.
				if (source.startsWith('pong-nodes-base/') && /\.(node|credentials)\.json$/.test(id)) {
					id = req.resolve(`pong-nodes-base/dist/${source.slice('pong-nodes-base/'.length)}`);
				}
				return { id, external: true };
			} catch {
				// Not resolvable to a built entry (e.g. a types-only subpath) — let the
				// default resolver handle it.
				return null;
			}
		},
	};
}
