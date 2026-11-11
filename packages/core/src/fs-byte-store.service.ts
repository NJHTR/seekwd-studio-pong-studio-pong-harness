import { FsByteStore } from '@pong/blob-storage';
import { Service } from '@pong/di';

import { ErrorReporter } from '@/errors';
import { StorageConfig } from '@/storage.config';

/**
 * The `fs` byte store rooted at `PONG_STORAGE_PATH`, shared by every domain that
 * persists blobs there. Needed because `FsByteStore` takes plain options and
 * carries no DI decorators, so injecting one requires a registered subclass.
 */
@Service()
export class FsByteStoreService extends FsByteStore {
	constructor(storageConfig: StorageConfig, errorReporter: ErrorReporter) {
		super({
			storagePath: storageConfig.storagePath,
			reportError: (error) => errorReporter.error(error),
		});
	}
}
