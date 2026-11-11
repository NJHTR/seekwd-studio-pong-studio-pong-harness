export {};

declare global {
	interface NodeData<C, J extends PongJson, B extends string, P> {
		context: C;
		item: J & PongJson;
		params: P;
	}

	// @ts-expect-error PongInputJson is populated dynamically
	type PongInput = NodeData<{}, PongInputJson, {}, {}>;

	const $itemIndex: number;
	const $json: PongInputJson & PongJson;
	const $binary: Record<PongInputBinaryKeys, PongBinary>;
}
