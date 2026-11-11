import { mockInstance } from '@pong/backend-test-utils';
import { DataSource, EntityManager, type EntityMetadata } from '@pong/typeorm';
import type { Cipher, Class } from 'pong-core';
import { mock } from 'vitest-mock-extended';

export const mockEntityManager = (entityClass: Class) => {
	const entityManager = mockInstance(EntityManager);
	const dataSource = mockInstance(DataSource, {
		manager: entityManager,
		getMetadata: () => mock<EntityMetadata>({ target: entityClass }),
	});
	Object.assign(entityManager, { connection: dataSource });
	return entityManager;
};

export const mockCipher = () =>
	mock<Cipher>({
		encryptV2: async (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
		decryptV2: async (data) => data,
	});
