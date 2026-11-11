import type { IDataObject } from 'pong-workflow';

export interface LoneScaleList {
	name: string;
	id: string;
	entity: string;
}

export interface ListsResponse {
	list?: LoneScaleList[];
}

export interface EnrichResponse {
	contacts?: IDataObject[];
}

export interface ContactSourcingResponse {
	contacts?: IDataObject[];
	profiles_found?: number;
}

export interface CompanySearchResponse {
	results?: IDataObject[];
	count?: number;
	custom?: IDataObject;
}
