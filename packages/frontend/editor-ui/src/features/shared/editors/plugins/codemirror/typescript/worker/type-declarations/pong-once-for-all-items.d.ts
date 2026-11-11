export {};

declare global {
	interface NodeData<C = any, J extends PongJson = any, B extends string = string, P = any> {
		context: C;
		params: P;
		all(branchIndex?: number, runIndex?: number): Array<PongItem<J, B>>;
		first(branchIndex?: number, runIndex?: number): PongItem<J, B>;
		last(branchIndex?: number, runIndex?: number): PongItem<J, B>;
		itemMatching(itemIndex: number): PongItem<J, B>;
	}

	// @ts-expect-error PongInputJson is populated dynamically
	type PongInput = NodeData<PongInputContext, PongInputJson, PongInputBinaryKeys, PongInputParams>;
}
