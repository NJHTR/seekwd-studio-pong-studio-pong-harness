import type { IWorkflowExecuteAdditionalData, TrustedSourceDirectory } from 'pong-workflow';

import { getTrustedSourceHelperFunctions } from '../trusted-source-helper-functions';

describe('getTrustedSourceHelperFunctions', () => {
	it('returns no helpers when the inbound-auth-core module is not loaded', () => {
		const additionalData = {} as IWorkflowExecuteAdditionalData;

		expect(getTrustedSourceHelperFunctions(additionalData)).toEqual({});
	});

	it('forwards the filter to the directory', async () => {
		const sources = [{ id: 'pong-internal', name: 'pong' }];
		const directory: TrustedSourceDirectory = {
			listTrustedSources: vi.fn().mockResolvedValue(sources),
		};
		const additionalData = {
			'inbound-auth-core': { trustedSourceDirectory: directory },
		} as unknown as IWorkflowExecuteAdditionalData;

		const helpers = getTrustedSourceHelperFunctions(additionalData);

		await expect(
			helpers.listTrustedSources!({ surface: 'trigger', capability: 'redirect-login' }),
		).resolves.toEqual(sources);
		expect(directory.listTrustedSources).toHaveBeenCalledWith({
			surface: 'trigger',
			capability: 'redirect-login',
		});
	});
});
