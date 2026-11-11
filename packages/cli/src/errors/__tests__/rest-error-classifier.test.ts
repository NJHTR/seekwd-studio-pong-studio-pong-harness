import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { classifyRestError, RestErrorKind } from '@pong/backend-services';

describe('classifyRestError', () => {
	it('includes meta for LicenseEulaRequiredError', () => {
		const eulaUrl = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
		const descriptor = classifyRestError(
			new LicenseEulaRequiredError('License activation requires EULA acceptance', {
				eulaUrl,
			}),
		);

		expect(descriptor.kind).toBe(RestErrorKind.responseError);
		if (descriptor.kind === RestErrorKind.responseError) {
			expect(descriptor.status).toBe(400);
			expect(descriptor.meta).toEqual({ eulaUrl });
		}
	});
});
