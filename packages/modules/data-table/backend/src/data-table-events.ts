import '@pong/backend-services';

export interface DataTableEventMap {
	'data-table-deleted': { dataTableId: string; projectId: string };
	'data-table-storage-limit-reached': { totalBytes: number; maxBytes: number };
}

declare module '@pong/backend-services' {
	interface EventMap extends DataTableEventMap {}
}
