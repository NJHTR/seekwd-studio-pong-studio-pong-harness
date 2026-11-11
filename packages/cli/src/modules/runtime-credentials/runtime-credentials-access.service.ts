import { Service } from '@pong/di';
import { Cipher } from 'pong-core';
import type { IDataObject, IRunExecutionData } from 'pong-workflow';
import { toSecureArtifacts } from 'pong-workflow';

import { RuntimeCredentialProvider } from '@pong/backend-services';

@Service()
export class RuntimeCredentialsAccessService implements RuntimeCredentialProvider {
	constructor(private readonly cipher: Cipher) {}

	async getRuntimeCredential(
		runExecutionData: IRunExecutionData,
		alias: string,
	): Promise<IDataObject[string] | undefined> {
		const secureArtifacts = runExecutionData.executionData?.runtimeData?.secureArtifacts;

		if (typeof secureArtifacts === 'string') {
			const decryptedSecureArtifacts = await this.cipher.decryptV2(secureArtifacts);
			const parsedSecureArtifacts = toSecureArtifacts(decryptedSecureArtifacts);

			return parsedSecureArtifacts.artifacts[alias];
		}
		return undefined;
	}
}
