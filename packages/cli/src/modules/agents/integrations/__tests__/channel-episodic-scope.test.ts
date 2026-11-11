import type { Logger } from '@pong/backend-common';
import type { OutboundHttp } from '@pong/backend-network';
import type { UrlService } from '@pong/backend-services';
import type { PersonRepository } from '@pong/db';
import type { InstanceSettings } from 'pong-core';
import { mock } from 'vitest-mock-extended';

import type { AgentRepository } from '../../repositories/agent.repository';
import type { ChannelRateLimitGuard } from '../channel-rate-limit.guard';
import { DiscordIntegration } from '../platforms/discord/discord-integration';
import { PongChatIntegration } from '../platforms/pong-chat/pong-chat-integration';
import { TeamsIntegration } from '../platforms/teams/teams-integration';
import { TelegramIntegration } from '../platforms/telegram/telegram-integration';
import { WhatsAppIntegration } from '../platforms/whatsapp/whatsapp-integration';
import type { WhatsAppOptionPagesStore } from '../platforms/whatsapp/whatsapp-option-pages.store';
import type { WhatsAppSetupTelemetryService } from '../platforms/whatsapp/whatsapp-setup-telemetry.service';
import type { WhatsAppWebhookVerificationStore } from '../platforms/whatsapp/whatsapp-webhook-verification.store';

describe('channel episodic memory policy', () => {
	const logger = mock<Logger>();
	const agentRepository = mock<AgentRepository>();
	const instanceSettings = mock<InstanceSettings>();
	const outboundHttp = mock<OutboundHttp>();

	it.each([
		[
			'Telegram',
			() =>
				new TelegramIntegration(
					logger,
					mock<UrlService>(),
					agentRepository,
					instanceSettings,
					outboundHttp,
				),
		],
		['Teams', () => new TeamsIntegration(logger, agentRepository)],
		[
			'WhatsApp',
			() =>
				new WhatsAppIntegration(
					logger,
					agentRepository,
					instanceSettings,
					mock<ChannelRateLimitGuard>(),
					mock<WhatsAppWebhookVerificationStore>(),
					outboundHttp,
					mock<WhatsAppOptionPagesStore>(),
					mock<WhatsAppSetupTelemetryService>(),
				),
		],
		[
			'Discord',
			() => new DiscordIntegration(logger, instanceSettings, agentRepository, outboundHttp),
		],
		['pong Chat', () => new PongChatIntegration(mock<PersonRepository>())],
	])('%s returns no episodic scope', (_name, create) => {
		expect(create().resolveEpisodicScope()).toBeNull();
	});
});
