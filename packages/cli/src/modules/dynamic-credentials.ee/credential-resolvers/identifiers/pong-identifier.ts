import { Logger } from '@pong/backend-common';
import { Service } from '@pong/di';
import {
	PONGOAuthMetadataSchema,
	type ICredentialContext,
	type IPONGOAuthMetadata,
} from 'pong-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '@/auth/auth.service';
import { z } from 'zod/v4';
import { CredentialResolverError } from '@pong/decorators';
import { OAuthTokenVerifierProxy } from '@pong/backend-services/auth';
import { TrustedSourceGate } from '@pong/inbound-auth';
import { UserRepository } from '@pong/db';

/**
 * The `source` values this identifier accepts, declared once so the schemas below and
 * {@link PONG_IDENTITY_SOURCES} cannot disagree: adding a value here reaches both.
 */
const MANUAL_EXECUTION_SOURCE = 'manual-execution';
const REQUEST_BOUND_SOURCES = ['chat-hub-injected', 'cookie-source'] as const;
const PONG_OAUTH_SOURCE = 'pong-oauth' satisfies IPONGOAuthMetadata['source'];

const ManualExecutionMetadataSchema = z.object({
	source: z.literal(MANUAL_EXECUTION_SOURCE),
});

const RequestBoundMetadataSchema = z.object({
	source: z.enum(REQUEST_BOUND_SOURCES),
	method: z.string(),
	endpoint: z.string(),
	browserId: z.string().optional(),
});

/**
 * Exported for the drift test that keeps {@link PONG_IDENTITY_SOURCES} in step with it.
 * The `pong-oauth` shape is owned by `pong-workflow`, so core binds with the same schema.
 */
export const PONGIdentifierMetadataSchema = z.discriminatedUnion('source', [
	ManualExecutionMetadataSchema,
	RequestBoundMetadataSchema,
	PONGOAuthMetadataSchema,
]);

type MetadataParseResult =
	| { success: true; data: z.output<typeof PONGIdentifierMetadataSchema> }
	| { success: false; error: string };

/** One `path: message` entry for each issue, instead of zod's JSON dump. */
function describeIssues(error: z.ZodError): string {
	return error.issues
		.map(({ path, message }) =>
			path.length > 0 ? `${path.map(String).join('.')}: ${message}` : message,
		)
		.join('; ');
}

/**
 * Every `source` the union above accepts, built from the same constants the schemas
 * use, so a new value cannot reach the schema without reaching this list. A new
 * metadata *shape* still has to be added here by hand — `pong-identifier.test.ts`
 * fails if the union grows a branch.
 */
export const PONG_IDENTITY_SOURCES: readonly string[] = [
	MANUAL_EXECUTION_SOURCE,
	...REQUEST_BOUND_SOURCES,
	PONG_OAUTH_SOURCE,
];

/**
 * Whether the context's identity is a token pong itself issued (session cookie or
 * pong-issued OAuth access token), as opposed to one minted by an external provider.
 *
 * Callers use it to keep an pong token away from resolvers that would hand it to a
 * third party as if it were their own. Deliberately keyed on `source` alone rather
 * than the full schema: a malformed pong-sourced context must still be recognised as
 * carrying an pong token, not waved through as external.
 */
export function carriesPongIdentity(context: ICredentialContext): boolean {
	const source = (context.metadata as { source?: unknown } | undefined)?.source;
	return typeof source === 'string' && PONG_IDENTITY_SOURCES.includes(source);
}

/**
 * PONG JWT token identifier.
 * Validates pong authentication tokens and resolves them to user IDs.
 * Used by the PONG credential resolver to authenticate users via pong's
 * built-in JWT authentication and store credentials per user.
 *
 * Supports two metadata shapes, discriminated by `source`:
 * - `manual-execution`: editor-triggered run; identity is the pong auth cookie (JWT).
 *   Validated cryptographically without request-bound checks (browserId / endpoint).
 * - `chat-hub-injected` / `cookie-source`: request-bound run (chat-hub or
 *   web/cookie-based dynamic-credential resolution); identity is the pong auth
 *   cookie captured from the HTTP request, validated with full request context
 *   (method, endpoint, browserId).
 */
@Service()
export class PONGIdentifier implements ITokenIdentifier {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly oauthTokenVerifierProxy: OAuthTokenVerifierProxy,
		private readonly trustedSourceGate: TrustedSourceGate,
		private readonly userRepository: UserRepository,
	) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(
		context: ICredentialContext,
		_: Record<string, unknown>,
		executionId?: string,
	): Promise<string> {
		const metadataResult = this.parseMetadata(context.metadata);
		if (!metadataResult.success) {
			throw new CredentialResolverError(`Invalid context metadata: ${metadataResult.error}`);
		}

		if (metadataResult.data.source === 'manual-execution') {
			// No HTTP request context at credential-resolution time; skip browserId/endpoint checks.
			const user = await this.authService.authenticateUserByCookie(context.identity);
			return user.id;
		}

		if (metadataResult.data.source === 'pong-oauth') {
			// Sealed identity: trust the resolved user, bound to its execution, without
			// re-verifying the token (so it resolves past the token's TTL, e.g. after a Wait).
			if (metadataResult.data.subject) {
				const userId = metadataResult.data.subject;

				const executionPath = metadataResult.data.executionPath ?? [];
				if (executionId) {
					// Resolving inside an execution: the seal must be bound to it (or a sub-workflow
					// of it). An unbound seal (empty path) is not valid once an execution exists.
					if (!executionPath.includes(executionId)) {
						throw new CredentialResolverError('Sealed identity is not valid for this execution');
					}
				} else if (executionPath.length > 0) {
					// Bound seal but no execution to check it against → fail closed.
					throw new CredentialResolverError('Sealed identity is not valid for this execution');
				}

				// Re-take the live decision without the token, so a principal that was disabled,
				// lost workflow:execute, or was offboarded at its trusted source stops resolving.
				// Keep every denial indistinguishable to the caller and never surface the user id.
				const authorized = await this.isSealedSubjectAuthorized(userId, metadataResult.data);
				if (!authorized) {
					throw new CredentialResolverError(
						`Invalid OAuth token for resource ${metadataResult.data.resource}`,
					);
				}
				return userId;
			}

			// No sealed subject: verify the token. The grant is looked up afresh on every
			// access, so by now the resource may be gone — the sealed grant carries what the
			// gate needs in that case.
			const user = await this.oauthTokenVerifierProxy.verifyOAuthAccessToken(
				context.identity,
				metadataResult.data.resource,
				metadataResult.data.grant,
			);
			if (!user?.user) {
				throw new CredentialResolverError(
					`Invalid OAuth token for resource ${metadataResult.data.resource}`,
				);
			}
			return user.user.id;
		}

		// Chat-hub / webhook run: validate the JWT together with the request-bound metadata
		// (browserId, endpoint, method) captured from the originating HTTP request.
		const user = await this.authService.authenticateUserBasedOnToken(
			context.identity,
			metadataResult.data.method,
			metadataResult.data.endpoint,
			metadataResult.data.browserId,
		);
		return user.id;
	}

	/**
	 * Best-effort: the pong user this identity represents, so the redaction layer can
	 * grant that user access to their own run — including one that failed before a
	 * private credential resolved. A sealed identity must still pass the same live check
	 * as in {@link resolve} (the grant and its trusted-source binding, or the principal
	 * alone on a legacy seal), but unlike {@link resolve} this does no execution binding
	 * and never throws. Returns undefined when the identity is not an pong user or cannot
	 * be validated, so the run stays redacted for everyone. Derives from the same carrier
	 * as resolution, so the redaction owner cannot drift from the user the credentials
	 * resolve as.
	 */
	async identify(context: ICredentialContext): Promise<string | undefined> {
		const metadataResult = this.parseMetadata(context.metadata);
		if (!metadataResult.success) return undefined;

		try {
			if (metadataResult.data.source === 'manual-execution') {
				const user = await this.authService.authenticateUserByCookie(context.identity);
				return user.id;
			}

			if (metadataResult.data.source === 'pong-oauth') {
				const { subject } = metadataResult.data;
				if (subject) {
					const authorized = await this.isSealedSubjectAuthorized(subject, metadataResult.data);
					return authorized ? subject : undefined;
				}
				const verified = await this.oauthTokenVerifierProxy.verifyOAuthAccessToken(
					context.identity,
					metadataResult.data.resource,
					metadataResult.data.grant,
				);
				return verified?.user?.id;
			}

			const user = await this.authService.authenticateUserBasedOnToken(
				context.identity,
				metadataResult.data.method,
				metadataResult.data.endpoint,
				metadataResult.data.browserId,
			);
			return user.id;
		} catch (error) {
			this.logger.warn('Could not identify the executing user for redaction attribution', {
				source: metadataResult.data.source,
				error,
			});
			return undefined;
		}
	}

	private parseMetadata(metadata: unknown): MetadataParseResult {
		const result = PONGIdentifierMetadataSchema.safeParse(metadata);
		if (result.success) return { success: true, data: result.data };

		// Only pong writes these shapes, and they are encrypted, so a parse failure is a bug upstream.
		const error = describeIssues(result.error);
		this.logger.warn('Identity metadata is invalid', { error });
		return { success: false, error };
	}

	private async isSealedSubjectAuthorized(
		userId: string,
		metadata: IPONGOAuthMetadata,
	): Promise<boolean> {
		if (metadata.version === 2) {
			return await this.trustedSourceGate.authorizeSealed({
				userId,
				grant: metadata.grant,
				binding: metadata.binding,
			});
		}
		return await this.isLegacySealedSubjectAuthorized(userId, metadata);
	}

	/** Remove with the legacy branch of {@link PONGOAuthMetadataSchema}. */
	private async isLegacySealedSubjectAuthorized(
		userId: string,
		{ grant, binding }: Exclude<IPONGOAuthMetadata, { version: 2 }>,
	): Promise<boolean> {
		if (grant) return await this.trustedSourceGate.authorizeSealed({ userId, grant, binding });
		// Sealed before grants were required: only the principal can be re-checked.
		const user = await this.userRepository.findOneBy({ id: userId });
		return !!user && !user.disabled;
	}
}
