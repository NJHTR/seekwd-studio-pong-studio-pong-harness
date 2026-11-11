import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'pong-workflow';

export class PongTrainingCustomerMessenger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customer Messenger (pong training)',
		name: 'pongTrainingCustomerMessenger',
		icon: {
			light: 'file:pongTrainingCustomerMessenger.svg',
			dark: 'file:pongTrainingCustomerMessenger.dark.svg',
		},
		group: ['transform'],
		version: 1,
		description: 'Dummy node used for pong training',
		defaults: {
			name: 'Customer Messenger (pong training)',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				required: true,
				default: '',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				typeOptions: {
					rows: 4,
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;

		for (let i = 0; i < length; i++) {
			const customerId = this.getNodeParameter('customerId', i) as string;

			const message = this.getNodeParameter('message', i) as string;

			responseData = { output: `Sent message to customer ${customerId}:  ${message}` };
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}
		return [returnData];
	}
}
