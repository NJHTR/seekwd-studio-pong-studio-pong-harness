import { isAbortError, Tool } from '@pong/agents';
import { getErrorMessage } from '@pong/utils/errors/get-error-message';

import type { InstanceAiContext } from '../types';
import {
	getLookupQuery,
	pickLookupMatches,
	rankPongDocsEntries,
	type PongDocsMatch,
} from './pong-docs/ranking';
import {
	getDocsUrlCandidates,
	getPongDocsRegistry,
	normalizeDocsUrl,
	PONG_DOCS_REGISTRY_URL,
	readPongDocsEntry,
	resetPongDocsRegistryCacheForTests,
	toPublicDocsUrl,
	type PongDocsDocument,
	parsePongDocsRegistry,
} from './pong-docs/registry';
import {
	DEFAULT_MAX_CONTENT_LENGTH,
	DEFAULT_MAX_PAGES,
	DEFAULT_MAX_RESULTS,
	MAX_CONTENT_LENGTH,
	MAX_PAGES,
	MAX_RESULTS,
	pongDocsRuntimeInputSchema,
	pongDocsToolInputSchema,
	type PongDocsLookupInput,
	type PongDocsReadInput,
	type PongDocsSearchInput,
} from './pong-docs/schemas';
import { PONG_DOCS_TOOL_ID } from './tool-ids';

export { PONG_DOCS_TOOL_ID };
export {
	PONG_DOCS_REGISTRY_URL,
	getDocsUrlCandidates,
	normalizeDocsUrl,
	parsePongDocsRegistry,
	rankPongDocsEntries,
	resetPongDocsRegistryCacheForTests,
	toPublicDocsUrl,
	type PongDocsDocument,
	type PongDocsMatch,
};

const SOURCE_ATTRIBUTION_INSTRUCTION =
	'When answering from returned docs, end with `Source: [Page title](page URL)` for one page or `Sources:` for multiple pages, using only returned page titles and URLs.';

function clamp(value: number | undefined, fallback: number, max: number): number {
	if (value === undefined) return fallback;
	return Math.min(value, max);
}

function toPublicMatch(match: PongDocsMatch): PongDocsMatch {
	const publicUrl = toPublicDocsUrl(match.url);
	return {
		...match,
		url: publicUrl,
		path: new URL(publicUrl).pathname,
	};
}

function emptyLookupResult(
	input: PongDocsLookupInput | PongDocsSearchInput,
	registry: Awaited<ReturnType<typeof getPongDocsRegistry>>,
) {
	return {
		query: getLookupQuery(input),
		intent: input.intent ?? 'general',
		registryUrl: PONG_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry?.fetchedAt ?? '',
		matches: [],
		documents: [],
		...(registry.hint ? { hint: registry.hint } : {}),
		...(registry.error ? { error: registry.error } : {}),
	};
}

/** The docs tool reads the registry and, for a credential question, resolves that
 *  credential type's own docs page — so it needs the credential service too. */
type PongDocsToolContext = Pick<InstanceAiContext, 'logger'> &
	Partial<Pick<InstanceAiContext, 'credentialService'>>;

/**
 * Fill in `documentationUrl` from the credential type when the caller named a type
 * but no URL. Ranking scores an exact docs-URL match far above query tokens, so
 * without this the answer depends on the model first chaining
 * `search_credential_types` to fetch the URL itself — which it often
 * skips, landing on the wrong pages and then answering from memory (AGENT-743).
 */
async function withResolvedDocumentationUrl<
	T extends { credentialType?: string; documentationUrl?: string },
>(context: PongDocsToolContext, input: T): Promise<T> {
	if (input.documentationUrl || !input.credentialType) return input;

	const resolved = await context.credentialService?.getDocumentationUrl?.(input.credentialType);
	return resolved ? { ...input, documentationUrl: resolved } : input;
}

async function handleSearch(
	context: PongDocsToolContext,
	input: PongDocsSearchInput,
	abortSignal?: AbortSignal,
) {
	const registry = await getPongDocsRegistry(context, abortSignal);
	if (!registry.registry) return emptyLookupResult(input, registry);

	const maxResults = clamp(input.maxResults, DEFAULT_MAX_RESULTS, MAX_RESULTS);
	const ranked = await withResolvedDocumentationUrl(context, input);
	const matches = rankPongDocsEntries(registry.registry.entries, ranked).slice(0, maxResults);

	return {
		query: getLookupQuery(input),
		intent: input.intent ?? 'general',
		registryUrl: PONG_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		matches: matches.map(toPublicMatch),
		...(registry.hint ? { hint: registry.hint } : {}),
	};
}

async function handleLookup(
	context: PongDocsToolContext,
	input: PongDocsLookupInput,
	abortSignal?: AbortSignal,
) {
	const registry = await getPongDocsRegistry(context, abortSignal);
	if (!registry.registry) return emptyLookupResult(input, registry);

	const maxPages = clamp(input.maxPages, DEFAULT_MAX_PAGES, MAX_PAGES);
	const maxContentLength = clamp(
		input.maxContentLength,
		DEFAULT_MAX_CONTENT_LENGTH,
		MAX_CONTENT_LENGTH,
	);
	const ranked = await withResolvedDocumentationUrl(context, input);
	const matches = rankPongDocsEntries(registry.registry.entries, ranked);
	const pagesToRead = pickLookupMatches(matches, maxPages);
	const documents: PongDocsDocument[] = [];
	const readErrors: string[] = [];

	const readResults = await Promise.allSettled(
		pagesToRead.map(async (match) => await readPongDocsEntry(match, maxContentLength, abortSignal)),
	);

	for (const [index, result] of readResults.entries()) {
		const match = pagesToRead[index];
		if (!match) continue;
		if (result.status === 'fulfilled') {
			documents.push(result.value);
		} else if (isAbortError(result.reason) || abortSignal?.aborted) {
			throw result.reason instanceof Error
				? result.reason
				: new Error('This operation was aborted');
		} else {
			readErrors.push(`${match.title}: ${getErrorMessage(result.reason)}`);
		}
	}

	const hints = [
		registry.hint,
		readErrors.length ? `Some docs pages could not be read: ${readErrors.join('; ')}` : undefined,
	].filter((hint): hint is string => typeof hint === 'string' && hint.length > 0);

	return {
		query: getLookupQuery(input),
		intent: input.intent ?? 'general',
		registryUrl: PONG_DOCS_REGISTRY_URL,
		registryFetchedAt: registry.registry.fetchedAt,
		matches: pagesToRead.map(toPublicMatch),
		documents,
		...(hints.length ? { hint: hints.join(' ') } : {}),
	};
}

async function handleRead(
	context: Pick<InstanceAiContext, 'logger'>,
	input: PongDocsReadInput,
	abortSignal?: AbortSignal,
) {
	const registry = await getPongDocsRegistry(context, abortSignal);
	if (!registry.registry) {
		return {
			url: input.url,
			registryUrl: PONG_DOCS_REGISTRY_URL,
			registryFetchedAt: '',
			documents: [],
			...(registry.hint ? { hint: registry.hint } : {}),
			...(registry.error ? { error: registry.error } : {}),
		};
	}

	const docsRegistry = registry.registry;
	const entry = getDocsUrlCandidates(input.url)
		.map((candidate) => docsRegistry.byUrl.get(candidate))
		.find((candidate) => candidate !== undefined);
	if (!entry) {
		return {
			url: input.url,
			registryUrl: PONG_DOCS_REGISTRY_URL,
			registryFetchedAt: docsRegistry.fetchedAt,
			documents: [],
			error: 'URL is not an pong docs registry entry.',
			...(registry.hint ? { hint: registry.hint } : {}),
		};
	}

	const maxContentLength = clamp(
		input.maxContentLength,
		DEFAULT_MAX_CONTENT_LENGTH,
		MAX_CONTENT_LENGTH,
	);
	return {
		url: toPublicDocsUrl(entry.url),
		registryUrl: PONG_DOCS_REGISTRY_URL,
		registryFetchedAt: docsRegistry.fetchedAt,
		documents: [await readPongDocsEntry(entry, maxContentLength, abortSignal)],
		...(registry.hint ? { hint: registry.hint } : {}),
	};
}

export function createPongDocsTool(context: PongDocsToolContext) {
	return new Tool(PONG_DOCS_TOOL_ID)
		.description(
			`Search and read current pong documentation from docs.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness. This tool is in your toolset: call it directly. Use for pong product, setup, credential, node, hosting, API, and troubleshooting questions, and prefer it over web search for anything pong ships. ${SOURCE_ATTRIBUTION_INSTRUCTION}`,
		)
		.input(pongDocsToolInputSchema)
		.handler(async (input, ctx) => {
			const parsedInput = pongDocsRuntimeInputSchema.parse(input);
			const abortSignal = ctx.abortSignal;
			switch (parsedInput.action) {
				case 'lookup':
					return await handleLookup(context, parsedInput, abortSignal);
				case 'search':
					return await handleSearch(context, parsedInput, abortSignal);
				case 'read':
					return await handleRead(context, parsedInput, abortSignal);
			}
		})
		.build();
}
