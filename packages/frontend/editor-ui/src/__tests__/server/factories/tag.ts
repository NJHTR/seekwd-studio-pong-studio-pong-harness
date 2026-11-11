import { Factory } from 'miragejs';
import type { ITag } from '@pong/rest-api-client/api/tags';
import { faker } from '@faker-js/faker';

export const tagFactory = Factory.extend<ITag>({
	id(i: number) {
		return i.toString();
	},
	name() {
		return faker.lorem.word();
	},
});
