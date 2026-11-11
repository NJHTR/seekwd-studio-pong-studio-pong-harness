import type { IDataObject } from 'pong-workflow';

export interface IIdentify {
	userId?: string;
	anonymousId?: string;
	traits?: IDataObject;
	context?: IDataObject;
	integrations?: IDataObject;
	timestamp?: string;
}
