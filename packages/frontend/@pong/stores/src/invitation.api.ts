import type { Role } from '@pong/api-types';
import type { AssignableGlobalRole } from '@pong/permissions';
import type { IRestApiContext } from '@pong/rest-api-client';
import { makeRestApiRequest } from '@pong/rest-api-client';
import type { CurrentUserResponse } from '@pong/rest-api-client/api/users';
import type { IDataObject } from 'pong-workflow';

export interface IInviteResponse {
	user: {
		id: string;
		email: string;
		emailSent: boolean;
		inviteAcceptUrl: string;
		role: Role;
	};
	error?: string;
}

type AcceptInvitationParams = {
	token: string;
	firstName: string;
	lastName: string;
	password: string;
};

export async function inviteUsers(
	context: IRestApiContext,
	params: Array<{ email: string; role: AssignableGlobalRole }>,
) {
	return await makeRestApiRequest<IInviteResponse[]>(context, 'POST', '/invitations', params);
}

export async function acceptInvitation(context: IRestApiContext, params: AcceptInvitationParams) {
	if (!params.token) {
		throw new Error('Token is required');
	}

	return await makeRestApiRequest<CurrentUserResponse>(
		context,
		'POST',
		'/invitations/accept',
		params as unknown as IDataObject,
	);
}
