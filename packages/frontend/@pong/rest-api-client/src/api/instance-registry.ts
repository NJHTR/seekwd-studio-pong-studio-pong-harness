import type { ClusterInfoResponse } from '@pong/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export const getClusterInfo = async (context: IRestApiContext): Promise<ClusterInfoResponse> => {
	return await makeRestApiRequest(context, 'GET', '/instance-registry');
};
