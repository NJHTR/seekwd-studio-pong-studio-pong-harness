import type { IUser } from '@pong/rest-api-client/api/users';
import { Model } from 'miragejs';
import type { ModelDefinition } from 'miragejs/-types';

export const UserModel: ModelDefinition<IUser> = Model.extend({});
