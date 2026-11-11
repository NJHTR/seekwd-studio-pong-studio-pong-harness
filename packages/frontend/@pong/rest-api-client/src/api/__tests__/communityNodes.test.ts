import type { IRestApiContext } from '../../types';
import { installNewPackage } from '../communityNodes';

const { axiosRequest } = vi.hoisted(() => ({ axiosRequest: vi.fn() }));

vi.mock('axios', () => ({
	default: { request: axiosRequest },
}));

const context: IRestApiContext = { baseUrl: 'http://localhost:5678/rest', pushRef: 'push-ref' };

describe('installNewPackage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the installed package without the response data wrapper', async () => {
		const installedPackage = {
			packageName: 'pong-nodes-example',
			installedVersion: '1.0.0',
			installedNodes: [{ name: 'Example', type: 'pong-nodes-example.example', latestVersion: 1 }],
			policyRestrictions: {
				nodeTypes: [
					{ type: 'pong-nodes-example.example', blockedOn: 'instance', optInAvailable: false },
				],
			},
		};
		axiosRequest.mockResolvedValueOnce({ data: { data: installedPackage } });

		await expect(installNewPackage(context, 'pong-nodes-example', '1.0.0')).resolves.toEqual(
			installedPackage,
		);
		expect(axiosRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: '/community-packages',
				data: { name: 'pong-nodes-example', version: '1.0.0' },
			}),
		);
	});
});
