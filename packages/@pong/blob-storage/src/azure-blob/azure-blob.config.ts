import { Config, Env } from '@pong/config';

@Config
export class AzureBlobConfig {
	/**
	 * Connection string for Azure Blob storage. Takes precedence over account
	 * name/key when set (and is the simplest option for Azurite local testing).
	 */
	@Env('PONG_EXTERNAL_STORAGE_AZURE_CONNECTION_STRING')
	connectionString: string = '';

	/** Storage account name, used with an account key or managed identity. */
	@Env('PONG_EXTERNAL_STORAGE_AZURE_ACCOUNT_NAME')
	accountName: string = '';

	/** Storage account key, used with the account name. */
	@Env('PONG_EXTERNAL_STORAGE_AZURE_ACCOUNT_KEY')
	accountKey: string = '';

	/** Name of the blob container to store execution data and/or binary data in. */
	@Env('PONG_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME')
	containerName: string = '';

	/** Custom blob endpoint, e.g. for Azurite or sovereign clouds. */
	@Env('PONG_EXTERNAL_STORAGE_AZURE_ENDPOINT')
	endpoint: string = '';

	/**
	 * Authenticate via `DefaultAzureCredential` (managed identity, env, Azure CLI)
	 * instead of an account key. Ignores `accountKey` when enabled.
	 */
	@Env('PONG_EXTERNAL_STORAGE_AZURE_AUTH_AUTO_DETECT')
	authAutoDetect: boolean = false;
}
