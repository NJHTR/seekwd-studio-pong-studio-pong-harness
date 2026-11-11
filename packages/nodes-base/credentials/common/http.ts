import type { IHttpRequestOptions, IRequestOptions } from 'pong-workflow';

export const getUrl = (options: IHttpRequestOptions | IRequestOptions): string => {
	if (options.url) {
		return new URL(options.url, options.baseURL).toString();
	}
	if ('uri' in options && options.uri) {
		return options.uri;
	}
	throw new Error('No URL found in request options');
};
