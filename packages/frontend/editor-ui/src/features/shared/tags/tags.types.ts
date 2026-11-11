import type { ITag } from '@pong/rest-api-client/api/tags';

export interface ITagRow {
	tag?: ITag;
	usage?: string;
	create?: boolean;
	disable?: boolean;
	update?: boolean;
	delete?: boolean;
	canDelete?: boolean;
	canUpdate?: boolean;
}
