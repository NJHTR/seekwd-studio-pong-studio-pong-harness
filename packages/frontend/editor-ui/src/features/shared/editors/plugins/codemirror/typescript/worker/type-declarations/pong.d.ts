import type { DateTime } from 'luxon';

export {};

declare global {
	type OutputItemWithoutJsonKey = {
		[key: string]: unknown;
	} & { json?: never };

	type OutputItemWithJsonKey = {
		json: {
			[key: string]: unknown;
		};
		binary?: {
			[key: string]: BinaryData;
		};
	};

	type MaybePromise<T> = Promise<T> | T;

	type OneOutputItem = OutputItemWithJsonKey | OutputItemWithoutJsonKey;
	type AllOutputItems = OneOutputItem | Array<OneOutputItem>;

	type PongOutputItem = MaybePromise<OneOutputItem>;
	type PongOutputItems = MaybePromise<AllOutputItems>;

	interface PongJson {
		[key: string]: any;
	}

	interface PongBinary {
		id: string;
		fileName: string;
		fileExtension: string;
		fileType: string;
		fileSize: string;
		mimeType: string;
	}

	interface PongBinaryData {
		data: string;
		mimeType: string;
		fileType?: BinaryFileType;
		fileName?: string;
		directory?: string;
		fileExtension?: string;
		fileSize?: string;
		bytes?: number;
		id?: string;
	}

	interface PongVars {}

	// TODO: populate dynamically
	interface PongParameter {}

	interface PongItem<J extends PongJson = PongJson, B extends string = string> {
		json: J & PongJson;
		binary: Record<B, PongBinary>;
	}

	interface PongCustomData {
		set(key: string, value: string): void;
		get(key: string): string;
		getAll(): Record<string, string>;
		setAll(values: Record<string, string>): void;
	}

	type PongExecutionMode = 'test' | 'production';
	interface PongExecution {
		id: string;
		mode: PongExecutionMode;
		resumeUrl?: string;
		resumeFormUrl?: string;
		customData: PongCustomData;
	}

	interface PongWorkflow {
		id: string;
		active: boolean;
		name: string;
	}

	interface PongPrevNode {
		name: string;
		outputIndex: number;
		runIndex: number;
	}

	const $input: PongInput;
	const $execution: PongExecution;
	const $workflow: PongWorkflow;
	const $prevNode: PongPrevNode;
	const $runIndex: number;
	const $now: DateTime;
	const $today: DateTime;
	type IHttpRequestMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';

	interface IHttpRequestOptions {
		url: string;
		baseURL?: string;
		headers?: Record<string, any>;
		method?: IHttpRequestMethods;
		body?: any;
		qs?: Record<string, any>;
		arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
		auth?: {
			username: string;
			password: string;
			sendImmediately?: boolean;
		};
		disableFollowRedirect?: boolean;
		encoding?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
		skipSslCertificateValidation?: boolean;
		returnFullResponse?: boolean;
		ignoreHttpStatusErrors?: boolean;
		proxy?: {
			host: string;
			port: number;
			auth?: {
				username: string;
				password: string;
			};
			protocol?: string;
		};
		timeout?: number;
		json?: boolean;
	}

	interface IPongHttpFullResponse {
		body: any;
		headers: Record<string, any>;
		statusCode: number;
		statusMessage?: string;
	}

	const helpers: {
		assertBinaryData: (itemIndex: number, propertyName: string | PongBinary) => PongBinary;
		getBinaryDataBuffer: (itemIndex: number, propertyName: string | PongBinary) => Promise<Buffer>;
		prepareBinaryData: (
			binaryData: Buffer,
			fileName?: string,
			mimeType?: string,
		) => Promise<PongBinary>;
		setBinaryDataBuffer: (metadata: PongBinary, buffer: Buffer) => Promise<PongBinary>;
		binaryToString: (body: Buffer, encoding?: string) => Promise<string>;
		httpRequest: (opts: IHttpRequestOptions) => Promise<IPongHttpFullResponse | any>;
	};

	const $parameter: PongInput['params'];
	const $vars: PongVars;
	const $nodeVersion: number;

	function $jmespath(object: Object | Array<any>, expression: string): any;
	function $if<B extends boolean, T, F>(
		condition: B,
		valueIfTrue: T,
		valueIfFalse: F,
	): B extends true ? T : T extends false ? F : T | F;
	function $ifEmpty<V, E>(value: V, valueIfEmpty: E): V | E;
	function $min(...numbers: number[]): number;
	function $max(...numbers: number[]): number;
	function $evaluateExpression(expression: string): any;
	function $getWorkflowStaticData(type: 'global' | 'node'): PongJson;

	type SomeOtherString = string & NonNullable<unknown>;
	// @ts-expect-error NodeName is created dynamically
	function $<K extends NodeName>(
		nodeName: K | SomeOtherString,
		// @ts-expect-error NodeDataMap is created dynamically
	): K extends keyof NodeDataMap ? NodeDataMap[K] : NodeData;
}
