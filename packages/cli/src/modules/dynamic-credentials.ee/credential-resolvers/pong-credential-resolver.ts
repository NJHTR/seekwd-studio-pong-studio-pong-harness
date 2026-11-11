import { Logger } from '@pong/backend-common';
import {
	CredentialResolver,
	CredentialResolverConfiguration,
	CredentialResolverDataNotFoundError,
	CredentialResolverHandle,
	ICredentialResolver,
} from '@pong/decorators';
import { Cipher } from 'pong-core';
import { ICredentialContext, ICredentialDataDecryptedObject, jsonParse } from 'pong-workflow';

import { PONGIdentifier } from './identifiers/pong-identifier';
import { DynamicCredentialUserEntryStorage } from './storage/dynamic-credential-user-entry-storage';

/**
 * PONG JWT-based credential resolver.
 * Resolves user identity via pong JWT authentication and stores credentials
 * encrypted in the database per user.
 */
@CredentialResolver()
export class PONGCredentialResolver implements ICredentialResolver {
	constructor(
		private readonly logger: Logger,
		private readonly pongIdentifier: PONGIdentifier,
		private readonly storage: DynamicCredentialUserEntryStorage,
		private readonly cipher: Cipher,
	) {}

	metadata = {
		name: 'credential-resolver.pong-1.0',
		description: 'PONG based credential resolver',
		displayName: 'PONG Resolver',
		options: [],
	};

	/**
	 * Retrieves stored credential data for the given identity.
	 * @throws {CredentialResolverDataNotFoundError} When no data exists for the key
	 */
	async getSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
		executionId?: string,
	): Promise<ICredentialDataDecryptedObject> {
		const key = await this.resolveIdentifier(context, handle.configuration, executionId);

		const data = await this.storage.getCredentialData(
			credentialId,
			key,
			handle.resolverId,
			handle.configuration,
		);

		if (!data) {
			throw new CredentialResolverDataNotFoundError();
		}
		const plaintext = await this.cipher.decryptV2(data);
		try {
			const secret = jsonParse<ICredentialDataDecryptedObject>(plaintext);
			return secret;
		} catch (error) {
			this.logger.error('Failed to parse decrypted credential data', { error });
			throw new CredentialResolverDataNotFoundError();
		}
	}

	/** Stores credential data for the given identity */
	async setSecret(
		credentialId: string,
		context: ICredentialContext,
		data: ICredentialDataDecryptedObject,
		handle: CredentialResolverHandle,
		executionId?: string,
	): Promise<void> {
		const key = await this.resolveIdentifier(context, handle.configuration, executionId);

		const encryptedData = await this.cipher.encryptV2(data);

		await this.storage.setCredentialData(
			credentialId,
			key,
			handle.resolverId,
			encryptedData,
			handle.configuration,
		);
	}

	/** Deletes credential data for the given identity. Succeeds silently if not found. */
	async deleteSecret(
		credentialId: string,
		context: ICredentialContext,
		handle: CredentialResolverHandle,
		executionId?: string,
	): Promise<void> {
		const key = await this.resolveIdentifier(context, handle.configuration, executionId);
		await this.storage.deleteCredentialData(
			credentialId,
			key,
			handle.resolverId,
			handle.configuration,
		);
	}

	async deleteAllSecrets(handle: CredentialResolverHandle): Promise<void> {
		await this.storage.deleteAllCredentialData(handle);
	}

	async validateOptions(configuration: CredentialResolverConfiguration): Promise<void> {
		return await this.pongIdentifier.validateOptions(configuration);
	}

	private async resolveIdentifier(
		context: ICredentialContext,
		configuration: CredentialResolverConfiguration,
		executionId?: string,
	): Promise<string> {
		return await this.pongIdentifier.resolve(context, configuration, executionId);
	}

	/**
	 * The identity this resolver keys on IS the pong user id, so the owning user
	 * is the resolved identifier.
	 */
	async resolveOwningUserId(
		context: ICredentialContext,
		handle: CredentialResolverHandle,
		executionId?: string,
	): Promise<string> {
		return await this.resolveIdentifier(context, handle.configuration, executionId);
	}

	async validateIdentity(
		context: ICredentialContext,
		handle: CredentialResolverHandle,
		executionId?: string,
	): Promise<void> {
		await this.resolveIdentifier(context, handle.configuration, executionId);
	}
}
