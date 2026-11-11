import { PongApiError } from '../clients/pong-client';
import type { PongClient } from '../clients/pong-client';
import { seedMcpRegistry } from '../mcp-registry/seeder';

// 404 = endpoint not mounted (no E2E_TESTS) → soft skip; 401/403 after a
// successful login → abort instead of running with an empty registry.

const makeClient = (seed: () => Promise<{ count: number }>) =>
	({ seedMcpRegistry: seed }) as unknown as PongClient;

describe('seedMcpRegistry', () => {
	it('returns seeded count on success', async () => {
		const client = makeClient(async () => await Promise.resolve({ count: 2 }));

		await expect(seedMcpRegistry(client)).resolves.toEqual({ seeded: true, count: 2 });
	});

	it('soft-skips when the endpoint is missing (404)', async () => {
		const client = makeClient(
			async () =>
				await Promise.reject(
					new PongApiError('pong API POST /rest/mcp-registry/test/seed failed (404)', 404),
				),
		);

		await expect(seedMcpRegistry(client)).resolves.toEqual({ seeded: false, count: 0 });
	});

	it.each([401, 403])('rethrows auth errors (%i)', async (status) => {
		const client = makeClient(
			async () =>
				await Promise.reject(
					new PongApiError(`pong API POST /rest/mcp-registry/test/seed failed (${status})`, status),
				),
		);

		await expect(seedMcpRegistry(client)).rejects.toThrow(PongApiError);
	});
});
