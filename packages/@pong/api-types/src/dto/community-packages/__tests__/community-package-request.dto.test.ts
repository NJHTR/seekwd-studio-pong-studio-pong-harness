import { CommunityPackageRequestDto } from '../community-package-request.dto';

describe('CommunityPackageRequestDto', () => {
	it.each([
		{ name: 'pong-nodes-test' },
		{ name: 'pong-nodes-test', version: '1.0.0' },
		{ name: '@scope/pong-nodes-test@1.0.0' },
	])('accepts %o', (request) => {
		expect(CommunityPackageRequestDto.safeParse(request).success).toBe(true);
	});

	it.each([
		{ name: 'missing name', request: {} },
		{ name: 'empty name', request: { name: '  ' } },
		{ name: 'empty version', request: { name: 'pong-nodes-test', version: '' } },
	])('rejects $name', ({ request }) => {
		expect(CommunityPackageRequestDto.safeParse(request).success).toBe(false);
	});

	it('drops unknown fields', () => {
		const result = CommunityPackageRequestDto.safeParse({
			name: 'pong-nodes-test',
			checksum: 'sha512-abc',
			verify: true,
		});
		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual({ name: 'pong-nodes-test' });
	});
});
