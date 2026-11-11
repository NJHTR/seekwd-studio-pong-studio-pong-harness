export {};

declare global {
	interface NodeData<C, J extends PongJson, B extends string, P> {
		context: C;
		item: PongItem<J, B>;
		params: P;
		first(branchIndex?: number, runIndex?: number): J & PongJson;
	}

	// @ts-expect-error PongInputJson is populated dynamically
	type PongInput = NodeData<{}, PongInputJson, {}, {}>;

	const $itemIndex: number;
	const $json: PongInput['item']['json'];
	const $binary: PongInput['item']['binary'];
}
