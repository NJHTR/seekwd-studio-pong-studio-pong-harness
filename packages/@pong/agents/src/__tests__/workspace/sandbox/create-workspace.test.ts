vi.mock('@pong/utils/get-jwt-expiry', () => ({
	getJwtExpiry: vi.fn(() => undefined),
}));

import { DaytonaFilesystem } from '../../../workspace/filesystem/daytona-filesystem';
import { PongSandboxFilesystem } from '../../../workspace/filesystem/pong-sandbox-filesystem';
import { createFilesystem, createSandbox } from '../../../workspace/sandbox/create-workspace';
import { DaytonaSandbox } from '../../../workspace/sandbox/daytona-sandbox';
import { PongSandboxServiceSandbox } from '../../../workspace/sandbox/pong-sandbox-sandbox';
import type { SandboxConfig } from '../../../workspace/sandbox/types';

describe('createSandbox', () => {
	it('returns undefined when sandbox is disabled', async () => {
		const config: SandboxConfig = { enabled: false, provider: 'pong-sandbox' };

		const result = await createSandbox(config);

		expect(result).toBeUndefined();
	});

	it('returns a DaytonaSandbox for daytona provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			id: 'instance-ai-thread-thread-1',
			name: 'instance-ai-thread-thread-1',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			image: 'node:20',
			snapshot: 'pong-instance-ai-1.0.0',
			timeout: 60_000,
			createTimeoutSeconds: 900,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect(result?.id).toBe('instance-ai-thread-thread-1');
		expect(result?.provider).toBe('daytona');
	});

	it('passes ephemeral through to the DaytonaSandbox', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			ephemeral: true,
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(DaytonaSandbox);
		expect((result as unknown as { options: { ephemeral?: boolean } }).options.ephemeral).toBe(
			true,
		);
	});

	it('passes stop, archive and delete intervals through to the DaytonaSandbox', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			autoStopInterval: 30,
			autoArchiveInterval: 1440,
			autoDeleteInterval: 43_200,
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(
			(
				result as unknown as {
					options: {
						autoStopInterval?: number;
						autoArchiveInterval?: number;
						autoDeleteInterval?: number;
					};
				}
			).options,
		).toMatchObject({
			autoStopInterval: 30,
			autoArchiveInterval: 1440,
			autoDeleteInterval: 43_200,
		});
	});

	it('omits ephemeral from the DaytonaSandbox when not configured', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://api.daytona.io',
			daytonaApiKey: 'test-key',
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(
			(result as unknown as { options: { ephemeral?: boolean } }).options.ephemeral,
		).toBeUndefined();
	});

	it('passes getAuthToken through to DaytonaSandbox in proxy mode', async () => {
		const getAuthToken = vi.fn().mockResolvedValue('jwt-token-123');
		const config: SandboxConfig = {
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			getAuthToken,
			timeout: 60_000,
		};

		const result = await createSandbox(config);

		expect(getAuthToken).not.toHaveBeenCalled();
		expect(result).toBeInstanceOf(DaytonaSandbox);
	});

	it('returns an PongSandboxServiceSandbox for pong-sandbox provider', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(PongSandboxServiceSandbox);
		expect(result?.provider).toBe('pong-sandbox');
	});

	it('passes the configured id through to the PongSandboxServiceSandbox', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			id: '11111111-1111-4111-8111-111111111111',
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(PongSandboxServiceSandbox);
		expect(result?.id).toBe('11111111-1111-4111-8111-111111111111');
	});

	it('passes ephemeral through to the PongSandboxServiceSandbox', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			ephemeral: true,
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(result).toBeInstanceOf(PongSandboxServiceSandbox);
		expect((result as unknown as { options: { ephemeral?: boolean } }).options.ephemeral).toBe(
			true,
		);
	});

	it('omits ephemeral from the PongSandboxServiceSandbox when not configured', async () => {
		const config: SandboxConfig = {
			enabled: true,
			provider: 'pong-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			timeout: 45_000,
		};

		const result = await createSandbox(config);

		expect(
			(result as unknown as { options: { ephemeral?: boolean } }).options.ephemeral,
		).toBeUndefined();
	});

	it('does not include sandbox secrets in unsupported provider errors', async () => {
		const config = {
			enabled: true,
			provider: 'unsupported',
			daytonaApiKey: 'daytona-secret',
			apiKey: 'sandbox-secret',
		} as unknown as SandboxConfig;

		let error: unknown;
		try {
			await createSandbox(config);
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(Error);
		if (!(error instanceof Error)) return;
		expect(error.message).toBe('Unsupported sandbox provider: unsupported');
		expect(error.message).not.toContain('daytona-secret');
		expect(error.message).not.toContain('sandbox-secret');
	});
});

describe('createFilesystem', () => {
	it('returns undefined when sandbox is undefined', () => {
		const result = createFilesystem(undefined);

		expect(result).toBeUndefined();
	});

	it('creates a DaytonaFilesystem for DaytonaSandbox', () => {
		const sandbox = new DaytonaSandbox({ apiKey: 'key' });

		const result = createFilesystem(sandbox);

		expect(result).toBeInstanceOf(DaytonaFilesystem);
		expect(result.id).toBe(`daytona-fs-${sandbox.id}`);
	});

	it('creates an PongSandboxFilesystem for PongSandboxServiceSandbox', () => {
		const sandbox = new PongSandboxServiceSandbox({
			apiKey: 'key',
			serviceUrl: 'https://sandbox.example.com',
		});

		const result = createFilesystem(sandbox);

		expect(result).toBeInstanceOf(PongSandboxFilesystem);
		expect(result.provider).toBe('pong-sandbox');
	});
});
