import type { IExecuteFunctions, INode } from 'pong-workflow';
import type { Mock, Mocked } from 'vitest';

import { BrandfetchV1 } from '../../v1/BrandfetchV1.node';
import * as GenericFunctions from '../../v1/GenericFunctions';

vi.mock('../../v1/GenericFunctions', () => ({
	brandfetchApiRequest: vi.fn(),
	fetchAndPrepareBinaryData: vi.fn(),
}));

const baseNode: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Brandfetch',
	type: 'pong-nodes-base.Brandfetch',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('BrandfetchV1.execute', () => {
	let node: BrandfetchV1;
	let executeFunctions: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new BrandfetchV1({
			displayName: 'Brandfetch',
			name: 'Brandfetch',
			icon: 'file:brandfetch.svg',
			group: ['output'],
			description: 'Consume Brandfetch API',
			defaultVersion: 2,
		});

		executeFunctions = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNode: vi.fn().mockReturnValue(baseNode),
			getNodeParameter: vi.fn(),
			continueOnFail: vi.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: vi.fn((data) => (Array.isArray(data) ? data : [data])),
				constructExecutionMetaData: vi.fn((data) => data),
			},
		} as unknown as Mocked<IExecuteFunctions>;
	});

	function mockParams(params: Record<string, unknown>) {
		executeFunctions.getNodeParameter.mockImplementation((name) => params[name as string] as never);
	}

	it('should return logos as JSON when operation is logo and download is false', async () => {
		mockParams({ operation: 'logo', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', download: false });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [{ type: 'logo', formats: [] }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledWith('GET', '/brands/github.com/NJHTR/seekwd-studio-pong-studio-pong-harness');
		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
		expect(result[0]).toEqual([{ type: 'logo', formats: [] }]);
	});

	it('should download logos as binary data when download is true', async () => {
		mockParams({
			operation: 'logo',
			domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['png'],
		});
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/logo.png' }],
				},
				{
					type: 'icon',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/icon.png' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).toHaveBeenCalledTimes(1);
		const [imageType, format, logoFormat, domain] = (
			GenericFunctions.fetchAndPrepareBinaryData as Mock
		).mock.calls[0];
		expect(imageType).toBe('logo');
		expect(format).toBe('png');
		expect(logoFormat).toEqual({
			format: 'png',
			src: 'https://cdn.brandfetch.io/github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/logo.png',
		});
		expect(domain).toBe('github.com/NJHTR/seekwd-studio-pong-studio-pong-harness');
		expect(result[0][0].json).toEqual([
			{
				type: 'logo',
				formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/logo.png' }],
			},
			{
				type: 'icon',
				formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/icon.png' }],
			},
		]);
	});

	it('should skip logo formats with null src', async () => {
		mockParams({
			operation: 'logo',
			domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['png'],
		});
		executeFunctions.getInputData.mockReturnValue([{ json: {}, binary: {} }]);
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: null }],
				},
			],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.fetchAndPrepareBinaryData).not.toHaveBeenCalled();
	});

	it('should preserve existing binary data when downloading logos', async () => {
		mockParams({
			operation: 'logo',
			domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['png'],
		});
		executeFunctions.getInputData.mockReturnValue([
			{ json: {}, binary: { existing: { data: 'keep' } as never } },
		]);
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/logo.png' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].binary).toHaveProperty('existing');
	});

	it('should drop empty binary key when no formats match', async () => {
		mockParams({
			operation: 'logo',
			domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['svg'],
		});
		executeFunctions.getInputData.mockReturnValue([{ json: {}, binary: {} }]);
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/logo.png' }],
				},
			],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].json).toEqual({});
		expect(result[0][0].binary).toBeUndefined();
	});

	// Legacy V1 quirk, frozen intentionally: when no formats match and the input
	// item has no binary key, the empty-binary cleanup throws.
	it('should throw when no formats match and the input item has no binary data', async () => {
		mockParams({
			operation: 'logo',
			domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
			download: true,
			imageTypes: ['logo'],
			imageFormats: ['svg'],
		});
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			logos: [
				{
					type: 'logo',
					formats: [{ format: 'png', src: 'https://cdn.brandfetch.io/logo.png' }],
				},
			],
		});

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(TypeError);
	});

	it('should return colors when operation is color', async () => {
		mockParams({ operation: 'color', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			colors: [{ hex: '#ff0000' }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ hex: '#ff0000' }]);
	});

	it('should return fonts when operation is font', async () => {
		mockParams({ operation: 'font', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			fonts: [{ name: 'Inter' }],
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ name: 'Inter' }]);
	});

	it('should return company data when operation is company', async () => {
		mockParams({ operation: 'company', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			company: { name: 'pong' },
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ name: 'pong' }]);
	});

	it('should return the full brand response when operation is industry (legacy V1 behavior)', async () => {
		mockParams({ operation: 'industry', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			name: 'pong',
			company: { industries: [{ name: 'Software' }] },
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ name: 'pong', company: { industries: [{ name: 'Software' }] } }]);
	});

	it('should push an error item when continueOnFail is true', async () => {
		mockParams({ operation: 'color', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		executeFunctions.continueOnFail.mockReturnValue(true);
		(GenericFunctions.brandfetchApiRequest as Mock).mockRejectedValue(new Error('boom'));

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toEqual([{ error: 'boom', json: {}, itemIndex: 0 }]);
	});

	it('should rethrow errors when continueOnFail is false', async () => {
		mockParams({ operation: 'color', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		(GenericFunctions.brandfetchApiRequest as Mock).mockRejectedValue(new Error('boom'));

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('boom');
	});

	it('should process every input item', async () => {
		mockParams({ operation: 'color', domain: 'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' });
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }, { json: {} }]);
		(GenericFunctions.brandfetchApiRequest as Mock).mockResolvedValue({
			colors: [{ hex: '#000' }],
		});

		await node.execute.call(executeFunctions);

		expect(GenericFunctions.brandfetchApiRequest).toHaveBeenCalledTimes(3);
	});

	it('exposes a valid node description', () => {
		const description = node.description;
		expect(description.version).toBe(1);
		const operationParam = description.properties.find((p) => p.name === 'operation');
		expect(operationParam?.options?.map((o) => (o as { value: string }).value)).toEqual(
			expect.arrayContaining(['color', 'company', 'font', 'industry', 'logo']),
		);
	});
});
