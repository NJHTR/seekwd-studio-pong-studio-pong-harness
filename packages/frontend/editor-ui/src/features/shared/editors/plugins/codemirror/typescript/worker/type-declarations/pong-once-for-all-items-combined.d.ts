export {};

declare global {
	interface NodeData<C = any, J extends PongJson = any, B extends string = string, P = any> {
		context: C;
		params: P;
		all(branchIndex?: number, runIndex?: number): Array<J & PongJson>;
		first(branchIndex?: number, runIndex?: number): J & PongJson;
		last(branchIndex?: number, runIndex?: number): J & PongJson;
		itemMatching(itemIndex: number): J & PongJson;
	}

	// @ts-expect-error PongInputJson is populated dynamically
	type PongInput = NodeData<PongInputContext, PongInputJson, PongInputBinaryKeys, PongInputParams>;
}
