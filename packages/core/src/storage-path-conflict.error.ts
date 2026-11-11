import { UserError } from 'pong-workflow';

export class StoragePathError extends UserError {
	static conflict() {
		return new StoragePathError(
			'Both PONG_STORAGE_PATH and PONG_BINARY_DATA_STORAGE_PATH cannot be set to different values. PONG_BINARY_DATA_STORAGE_PATH is deprecated. Please set only PONG_STORAGE_PATH.',
		);
	}

	static taken(oldPath: string, newPath: string) {
		return new StoragePathError(
			`Failed to migrate ${oldPath} to ${newPath} because ${newPath} already exists. Please rename ${newPath} so pong can migrate ${oldPath} to this path.`,
		);
	}
}
