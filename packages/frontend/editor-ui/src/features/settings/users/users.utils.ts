import { ROLE } from '@pong/api-types';
import type { IUser } from '@pong/rest-api-client/api/users';
import type { ILogInStatus } from './users.types';

/*
	Utility functions used to handle users in pong
*/

export const LOGIN_STATUS: { LoggedIn: ILogInStatus; LoggedOut: ILogInStatus } = {
	LoggedIn: 'LoggedIn', // Can be owner or member or default user
	LoggedOut: 'LoggedOut', // Can only be logged out if UM has been setup
};

export const isUserGlobalOwner = (user: IUser): boolean => user.role === ROLE.Owner;
