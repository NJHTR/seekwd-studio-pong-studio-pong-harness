export namespace pong {
	export interface PackageJson {
		name: string;
		version: string;
		pong?: {
			credentials?: string[];
			nodes?: string[];
			/** A positive integer or `"<major>.<minor>"`, as declared by the package. */
			pongNodesApiVersion?: number | string;
		};
		author?: {
			name?: string;
			email?: string;
		};
	}
}
