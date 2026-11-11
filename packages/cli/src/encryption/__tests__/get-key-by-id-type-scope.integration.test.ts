import { mockInstance, testDb } from '@pong/backend-test-utils';
import { DeploymentKey } from '@pong/db';
import { Container } from '@pong/di';
import { DataSource, type Repository } from '@pong/typeorm';
import { InstanceSettings } from 'pong-core';

import { KeyManagerService } from '@/encryption/key-manager.service';

let keyStore: Repository<DeploymentKey>;

beforeAll(async () => {
	mockInstance(InstanceSettings, {
		encryptionKey: 'get-key-by-id-type-scope-instance-key',
		pongFolder: '/tmp/pong-test',
		instanceType: 'main',
		canSeedDeploymentState: true,
	});
	await testDb.init();
	keyStore = Container.get(DataSource).getRepository(DeploymentKey);
});

afterAll(async () => {
	await testDb.terminate();
});

// Locks in that a row of another type cannot be returned for a data-encryption
// lookup, even though `id` is the table's only primary key across all types.
describe('getKeyById() type scoping (integration)', () => {
	it('does not resolve a jwe.private-key row', async () => {
		const jweRow = await keyStore.save(
			keyStore.create({
				type: 'jwe.private-key',
				value: 'jwe-secret',
				algorithm: 'RSA-OAEP-256',
				status: 'active',
			}),
		);

		const result = await Container.get(KeyManagerService).getKeyById(jweRow.id);

		expect(result).toBeNull();
	});

	it('does not resolve a signing.hmac row', async () => {
		const hmacRow = await keyStore.save(
			keyStore.create({
				type: 'signing.hmac',
				value: 'hmac-secret',
				algorithm: null,
				status: 'active',
			}),
		);

		const result = await Container.get(KeyManagerService).getKeyById(hmacRow.id);

		expect(result).toBeNull();
	});
});
