import type { IExecuteFunctions } from 'pong-workflow';
import { NodeConnectionTypes } from 'pong-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { getOptionalOutputParser } from './PongOutputParser';
import type { PongStructuredOutputParser } from './PongStructuredOutputParser';

describe('getOptionalOutputParser', () => {
	let mockContext: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockContext = mock<IExecuteFunctions>();
		vi.clearAllMocks();
	});

	it('should return undefined when hasOutputParser is false', async () => {
		mockContext.getNodeParameter.mockReturnValue(false);

		const result = await getOptionalOutputParser(mockContext);

		expect(result).toBeUndefined();
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('hasOutputParser', 0, true);
		expect(mockContext.getInputConnectionData).not.toHaveBeenCalled();
	});

	it('should return output parser when hasOutputParser is true with default index', async () => {
		const mockParser = mock<PongStructuredOutputParser>();
		mockContext.getNodeParameter.mockReturnValue(true);
		mockContext.getInputConnectionData.mockResolvedValue(mockParser);

		const result = await getOptionalOutputParser(mockContext);

		expect(result).toBe(mockParser);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('hasOutputParser', 0, true);
		expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiOutputParser,
			0,
		);
	});

	it('should use provided index when fetching output parser', async () => {
		const mockParser = mock<PongStructuredOutputParser>();
		mockContext.getNodeParameter.mockReturnValue(true);
		mockContext.getInputConnectionData.mockResolvedValue(mockParser);

		const result = await getOptionalOutputParser(mockContext, 2);

		expect(result).toBe(mockParser);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('hasOutputParser', 0, true);
		expect(mockContext.getInputConnectionData).toHaveBeenCalledWith(
			NodeConnectionTypes.AiOutputParser,
			2,
		);
	});

	it('should handle different index values correctly', async () => {
		const mockParser1 = mock<PongStructuredOutputParser>();
		const mockParser2 = mock<PongStructuredOutputParser>();
		const mockParser3 = mock<PongStructuredOutputParser>();

		mockContext.getNodeParameter.mockReturnValue(true);
		mockContext.getInputConnectionData
			.mockResolvedValueOnce(mockParser1)
			.mockResolvedValueOnce(mockParser2)
			.mockResolvedValueOnce(mockParser3);

		const result1 = await getOptionalOutputParser(mockContext, 0);
		const result2 = await getOptionalOutputParser(mockContext, 1);
		const result3 = await getOptionalOutputParser(mockContext, 5);

		expect(result1).toBe(mockParser1);
		expect(result2).toBe(mockParser2);
		expect(result3).toBe(mockParser3);

		expect(mockContext.getInputConnectionData).toHaveBeenNthCalledWith(
			1,
			NodeConnectionTypes.AiOutputParser,
			0,
		);
		expect(mockContext.getInputConnectionData).toHaveBeenNthCalledWith(
			2,
			NodeConnectionTypes.AiOutputParser,
			1,
		);
		expect(mockContext.getInputConnectionData).toHaveBeenNthCalledWith(
			3,
			NodeConnectionTypes.AiOutputParser,
			5,
		);
	});

	it('should always check hasOutputParser at index 0', async () => {
		mockContext.getNodeParameter.mockReturnValue(false);

		await getOptionalOutputParser(mockContext, 3);

		// Even when called with index 3, hasOutputParser is checked at index 0
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('hasOutputParser', 0, true);
		expect(mockContext.getInputConnectionData).not.toHaveBeenCalled();
	});
});
