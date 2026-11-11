import type { AssignableGlobalRole } from '@pong/permissions';
import type { IUser } from '@pong/rest-api-client/api/users';

export type ILogInStatus = 'LoggedIn' | 'LoggedOut';

// Any global role that can be assigned to a user (system roles except owner, plus custom instance roles).
export type InvitableRoleName = AssignableGlobalRole;

export interface IUserListAction {
	label: string;
	value: string;
	guard?: (user: IUser) => boolean;
}
