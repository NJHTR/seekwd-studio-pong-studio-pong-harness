import { PONG_CHAT_INTEGRATION_TYPE } from '@pong/api-types';
import type { AgentToolOutputFile, RichCardComponentType } from '@pong/api-types';
import { PersonRepository } from '@pong/db';
import { Service } from '@pong/di';
import { UnexpectedError } from '@pong/errors';

import type { AgentChatAttachment } from '../../../entities/agent-chat-attachment.entity';
import {
	AgentChatIntegration,
	type PlatformActionParams,
	type PlatformContextQueryParams,
} from '../../agent-chat-integration';
import { respondInputSchema } from '../../integration-action-executor';
import { INTEGRATION_ERROR_CODES } from '../../integration-error-codes';
import { integrationError, unsupportedQuery } from '../../integration-helpers';
import {
	resolveIntegrationActionDefinitions,
	resolveIntegrationContextQueryDefinitions,
} from '../../integration-tool-definitions';
import type { IntegrationActionResult } from '../../integration-tools';

/**
 * The in-app chat channel ("pong Chat").
 *
 * Credential-less. The integration implementation is always registered.
 * A draft channel entry enables production chat after publish. Preview stays
 * available without an entry. A synthetic tool descriptor is injected per run
 * when execution comes through the chat endpoints. `respond`
 * does not post anywhere — the card renders from the tool-call input in the
 * chat UI, and interactive cards suspend through the generic machinery.
 */
@Service()
export class PongChatIntegration extends AgentChatIntegration {
	readonly type = PONG_CHAT_INTEGRATION_TYPE;

	readonly credentialTypes: string[] = [];

	readonly displayLabel = 'pong Chat';

	readonly displayIcon = 'message-square';

	readonly internal = true;

	readonly requiresChatInstance = false;

	readonly builderGuidance = {
		capabilities: [
			'Make the agent available to users of this pong instance in pong Chat.',
			'Respond in the pong Chat conversation and render rich cards with buttons and selects.',
			'Needs no credential. The setup card saves the channel and the agent description that pong Chat shows.',
			'Production pong Chat reaches only a published agent: after setup, offer to publish if the agent is not published.',
		],
		useIntegrationWhen: [
			'The user asks to make the agent available in pong Chat, or to chat with it inside pong.',
			'The agent should be usable by people on this pong instance without an external chat platform.',
		],
		useNodeToolWhen: ['Never. pong Chat is a channel only and has no node tool.'],
	};

	readonly supportedComponents: readonly RichCardComponentType[] = [
		'section',
		'button',
		'select',
		'radio_select',
		'divider',
		'image',
		'fields',
	];

	readonly contextToolDefinitions = resolveIntegrationContextQueryDefinitions([
		'get_current_message_context',
		'get_current_subject',
		'get_current_user',
	]);

	readonly actionToolDefinitions = resolveIntegrationActionDefinitions(['respond']);

	// The chat shows stored files and loads no bytes, so it needs no size cap beyond the storage limit.
	readonly fileUploadLimits = { maxFiles: 10, maxFileBytes: Number.MAX_SAFE_INTEGER };

	readonly actionToolGuidance = [
		'This is the built-in pong chat: your normal assistant reply already reaches the user. NEVER call respond with only message.text — write that text directly in your reply instead. Call this tool only with message.card, to render a rich card or collect structured input, or with fileIds, to show files with your reply.',
		'To send files, call respond with fileIds and a short message.text. The files show on your reply. Write your reply as the message for the files, and do not mention fileIds.',
	];

	constructor(private readonly personRepository: PersonRepository) {
		super();
	}

	/** Internal pong chat does not go through the bridge and has no platform context. */
	buildOriginDraft() {
		return undefined;
	}

	/** Internal pong chat does not go through the bridge, so it never resolves a channel scope. */
	resolveEpisodicScope() {
		return null;
	}

	async createAdapter(): Promise<unknown> {
		throw new UnexpectedError('The pong chat integration has no platform adapter.');
	}

	async executeAction(params: PlatformActionParams): Promise<IntegrationActionResult | undefined> {
		if (params.action !== 'respond') return undefined;
		const parsed = respondInputSchema.safeParse(params.input);
		if (!parsed.success) {
			return integrationError(INTEGRATION_ERROR_CODES.ACTION_FAILED, parsed.error.message);
		}
		// The chat UI shows these files on the reply. It reads them from this result.
		const files = (params.files ?? []).map(toOutputFile);
		// Text-only responds deliver nothing in the in-app chat (the agent's
		// normal reply IS this channel) — returning ok would trick the model
		// into believing the text reached the user. Fail with a self-correcting
		// message instead.
		if (!parsed.data.message.card && files.length > 0) {
			return {
				ok: true,
				files,
				note: 'The files show with your reply. Write your reply as the message for the files, and do not mention fileIds.',
			};
		}
		if (!parsed.data.message.card) {
			return integrationError(
				INTEGRATION_ERROR_CODES.ACTION_FAILED,
				'Plain text is not delivered through this tool in the pong chat — your normal assistant reply already reaches the user, so write the text directly in your reply. Call this tool only with message.card to render a rich card.',
			);
		}
		if (!params.currentMessageContext) {
			return integrationError(
				INTEGRATION_ERROR_CODES.NO_MESSAGE_CONTEXT,
				'There is no current message context.',
			);
		}
		// No external post: the chat UI renders the card from the tool-call
		// input. Echo the context so the thread target stays current.
		// The tool boundary validates through the generated action schema and
		// the executor parses respond input with `respondInputSchema`; this
		// parse guards direct executor calls.
		return {
			ok: true,
			...(files.length > 0 ? { files } : {}),
			messageContext: {
				...params.currentMessageContext,
				messageId: undefined,
				updatedAt: new Date().toISOString(),
			},
		};
	}

	async executeContextQuery(params: PlatformContextQueryParams): Promise<unknown> {
		// `get_current_user` is handled generically: integration-tools reads
		// `interactingUserId` from the stored context and delegates here as
		// `get_user`. Agents cannot call `get_user` directly (not declared in
		// `contextQueries`, so it is absent from the tool input schema).
		if (params.query === 'get_user') {
			const userId = typeof params.input.userId === 'string' ? params.input.userId : undefined;
			if (!userId) {
				return integrationError(
					INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
					'userId is required.',
				);
			}
			const person = await this.personRepository.findById(userId);
			// A service account has no name or email to return.
			if (!person) {
				return integrationError(
					INTEGRATION_ERROR_CODES.CONTEXT_QUERY_FAILED,
					`User ${userId} not found or is not a person.`,
				);
			}
			return {
				ok: true,
				user: {
					id: person.id,
					name: [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email,
					email: person.email,
				},
			};
		}
		return unsupportedQuery(this.type, params.query);
	}
}

function toOutputFile(file: AgentChatAttachment): AgentToolOutputFile {
	return {
		fileId: file.id,
		fileName: file.fileName,
		mimeType: file.mimeType,
		sizeBytes: file.fileSizeBytes,
	};
}
