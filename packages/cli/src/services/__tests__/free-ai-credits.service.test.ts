import type { LicenseState } from '@pong/backend-common';
import type { GlobalConfig } from '@pong/config';
import type { User } from '@pong/db';
import { mock } from 'vitest-mock-extended';

import { FREE_AI_CREDITS_CREDENTIAL_NAME } from '@/constants';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiService } from '@/services/ai.service';
import type { UserService } from '@/services/user.service';

import { FreeAiCreditsService } from '../free-ai-credits.service';

describe('FreeAiCreditsService', () => {
	const licenseState = mock<LicenseState>();
	const globalConfig = mock<GlobalConfig>({
		aiAssistant: { baseUrl: 'https://ai-assistant.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
		aiGateway: { enabled: false },
	});
	const aiService = mock<AiService>();
	const credentialsService = mock<CredentialsService>();
	const userService = mock<UserService>();

	const service = new FreeAiCreditsService(
		licenseState,
		globalConfig,
		aiService,
		credentialsService,
		userService,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		licenseState.isAiCreditsLicensed.mockReturnValue(true);
		licenseState.isAiGatewayLicensed.mockReturnValue(false);
		globalConfig.aiAssistant.baseUrl = 'https://ai-assistant.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
		globalConfig.aiGateway.enabled = false;
	});

	describe('isEligible', () => {
		it('returns true when AI credits are licensed, the base URL is set, Connect is off, and the user has not claimed', () => {
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(true);
		});

		it('returns false when AI credits are not licensed', () => {
			licenseState.isAiCreditsLicensed.mockReturnValue(false);
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(false);
		});

		it('returns false when the AI assistant base URL is not configured', () => {
			globalConfig.aiAssistant.baseUrl = '';
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(false);

			globalConfig.aiAssistant.baseUrl = 'https://ai-assistant.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
		});

		it('returns false when pong Connect is enabled and licensed', () => {
			globalConfig.aiGateway.enabled = true;
			licenseState.isAiGatewayLicensed.mockReturnValue(true);
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(false);
		});

		it('returns true when pong Connect is enabled but not licensed', () => {
			globalConfig.aiGateway.enabled = true;
			const user = { settings: {} } as User;

			expect(service.isEligible(user)).toBe(true);
		});

		it('returns false when the user already claimed free credits', () => {
			const user = { settings: { userClaimedAiCredits: true } } as User;

			expect(service.isEligible(user)).toBe(false);
		});
	});

	describe('claim', () => {
		it('generates credits, creates a managed credential, and marks the user as claimed', async () => {
			const user = { id: 'user123', settings: {} } as User;
			aiService.createFreeAiCredits.mockResolvedValue({
				apiKey: 'sk-test',
				url: 'https://proxy.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			});
			const credential = mock<Awaited<ReturnType<CredentialsService['createManagedCredential']>>>();
			credentialsService.createManagedCredential.mockResolvedValue(credential);

			const result = await service.claim(user, 'project123');

			expect(aiService.createFreeAiCredits).toHaveBeenCalledWith(user);
			expect(credentialsService.createManagedCredential).toHaveBeenCalledWith(
				{
					name: FREE_AI_CREDITS_CREDENTIAL_NAME,
					type: 'openAiApi',
					data: { apiKey: 'sk-test', url: 'https://proxy.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' },
					projectId: 'project123',
				},
				user,
			);
			expect(userService.updateSettings).toHaveBeenCalledWith('user123', {
				userClaimedAiCredits: true,
			});
			expect(result).toBe(credential);
		});
	});
});
