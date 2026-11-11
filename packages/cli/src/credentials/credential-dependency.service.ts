import type { CredentialDependencyType } from '@pong/db';
import {
	CredentialDependencyRepository,
	EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
	SecretsProviderConnectionRepository,
} from '@pong/db';
import { Service } from '@pong/di';
import { In, type EntityManager } from '@pong/typeorm';
import type { ICredentialDataDecryptedObject } from 'pong-workflow';

import { extractProviderKeysFromCredentialData } from './external-secrets.utils';

export { EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE } from '@pong/db';

export type CredentialDependencyFilter = {
	dependencyType: CredentialDependencyType;
	dependencyId: string;
};

@Service()
export class CredentialDependencyService {
	constructor(
		private readonly credentialDependencyRepository: CredentialDependencyRepository,
		private readonly secretsProviderConnectionRepository: SecretsProviderConnectionRepository,
	) {}

	async resolveExternalSecretsStoreDependencyFilter(
		externalSecretsStoreProviderKey: string,
	): Promise<CredentialDependencyFilter | undefined> {
		const providerId = await this.secretsProviderConnectionRepository.findIdByProviderKey(
			externalSecretsStoreProviderKey,
		);

		if (providerId === null) return undefined;

		return {
			dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
			dependencyId: providerId,
		};
	}

	async resolveProviderIdsFromCredentialData(
		decryptedCredentialData: ICredentialDataDecryptedObject,
		entityManager?: EntityManager,
	): Promise<string[]> {
		const providerKeys = [...extractProviderKeysFromCredentialData(decryptedCredentialData)];
		return await this.secretsProviderConnectionRepository.findIdsByProviderKeys(
			providerKeys,
			entityManager,
		);
	}

	async upsertExternalSecretProviderDependenciesForCredential({
		credentialId,
		decryptedCredentialData,
		entityManager,
	}: {
		credentialId: string;
		decryptedCredentialData: ICredentialDataDecryptedObject;
		entityManager: EntityManager;
	}): Promise<void> {
		const dependencyIds = await this.resolveProviderIdsFromCredentialData(
			decryptedCredentialData,
			entityManager,
		);
		await this.credentialDependencyRepository.upsertDependenciesForCredential({
			credentialId,
			dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
			dependencyIds,
			entityManager,
		});
	}

	async syncExternalSecretProviderDependenciesForCredential({
		credentialId,
		decryptedCredentialData,
		entityManager,
	}: {
		credentialId: string;
		decryptedCredentialData: ICredentialDataDecryptedObject;
		entityManager: EntityManager;
	}): Promise<void> {
		const dependencyIds = await this.resolveProviderIdsFromCredentialData(
			decryptedCredentialData,
			entityManager,
		);
		await this.credentialDependencyRepository.syncDependenciesForCredential({
			credentialId,
			dependencyType: EXTERNAL_SECRET_PROVIDER_DEPENDENCY_TYPE,
			dependencyIds,
			entityManager,
		});
	}

	async deleteDependencyById({
		dependencyType,
		dependencyId,
		entityManager,
	}: {
		dependencyType: CredentialDependencyType;
		dependencyId: string;
		entityManager?: EntityManager;
	}): Promise<void> {
		const manager = entityManager ?? this.credentialDependencyRepository.manager;
		await manager.delete(this.credentialDependencyRepository.target, {
			dependencyType,
			dependencyId,
		});
	}

	async deleteDependenciesByIds({
		dependencyType,
		dependencyIds,
		entityManager,
	}: {
		dependencyType: CredentialDependencyType;
		dependencyIds: string[];
		entityManager?: EntityManager;
	}): Promise<void> {
		if (dependencyIds.length === 0) return;

		const manager = entityManager ?? this.credentialDependencyRepository.manager;
		await manager.delete(this.credentialDependencyRepository.target, {
			dependencyType,
			dependencyId: In(dependencyIds),
		});
	}
}
