/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from '@pong/backend-common';
import { Container } from '@pong/di';
import { existsSync, renameSync } from 'node:fs';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { InstanceSettings } from '@/instance-settings';
import { mockInstance } from '@test/utils';

import { StoragePathError } from '../storage-path-conflict.error';
import { StorageConfig } from '../storage.config';

vi.mock('node:fs', () => ({
	existsSync: vi.fn(),
	renameSync: vi.fn(),
}));

describe('StorageConfig', () => {
	const pongFolder = '~/.pong';
	let markFsStorageMigrated: Mock;
	let logger: Logger;

	beforeEach(() => {
		process.env = {};
		vi.resetAllMocks();
		Container.reset();
		markFsStorageMigrated = vi.fn();
		mockInstance(InstanceSettings, {
			pongFolder,
			fsStorageMigrated: false,
			markFsStorageMigrated,
		});
		logger = mock<Logger>();
		Container.set(Logger, logger);
		(existsSync as Mock).mockReturnValue(false);
	});

	it('should use default values when no env variables are defined', () => {
		const config = Container.get(StorageConfig);

		expect(config.mode).toBe('database');
		expect(config.storagePath).toBe('~/.pong/storage');
	});

	it('should set mode to filesystem when PONG_EXECUTION_DATA_STORAGE_MODE is filesystem', () => {
		process.env.PONG_EXECUTION_DATA_STORAGE_MODE = 'filesystem';

		const config = Container.get(StorageConfig);

		expect(config.mode).toBe('filesystem');
	});

	it('should override default path when PONG_STORAGE_PATH is set', () => {
		process.env.PONG_STORAGE_PATH = '/custom/storage/path';

		const config = Container.get(StorageConfig);

		expect(config.storagePath).toBe('/custom/storage/path');
	});

	it('should throw error when PONG_STORAGE_PATH and PONG_BINARY_DATA_STORAGE_PATH are set to different values', () => {
		process.env.PONG_STORAGE_PATH = '/path/one';
		process.env.PONG_BINARY_DATA_STORAGE_PATH = '/path/two';

		expect(() => Container.get(StorageConfig)).toThrow(StoragePathError);
	});

	it('should not throw error when PONG_STORAGE_PATH and PONG_BINARY_DATA_STORAGE_PATH are set to the same value', () => {
		process.env.PONG_STORAGE_PATH = '/same/path';
		process.env.PONG_BINARY_DATA_STORAGE_PATH = '/same/path';

		const config = Container.get(StorageConfig);

		expect(config.storagePath).toBe('/same/path');
	});

	it('should fall back to default for invalid mode value', () => {
		process.env.PONG_EXECUTION_DATA_STORAGE_MODE = 'invalid-mode';
		console.warn = vi.fn();

		const config = Container.get(StorageConfig);

		expect(config.mode).toBe('database');
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for PONG_EXECUTION_DATA_STORAGE_MODE'),
		);
	});

	describe('storage dir migration', () => {
		it('should log deprecation warning and use old path when old path exists but migration not enabled', () => {
			(existsSync as Mock).mockReturnValueOnce(true); // old path exists

			const config = Container.get(StorageConfig);

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Deprecation warning'));
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('PONG_MIGRATE_FS_STORAGE_PATH=true'),
			);
			expect(config.storagePath).toBe('~/.pong/binaryData');
			expect(renameSync).not.toHaveBeenCalled();
			expect(markFsStorageMigrated).not.toHaveBeenCalled();
		});

		it('should proceed when old path exists and migration is enabled', () => {
			process.env.PONG_MIGRATE_FS_STORAGE_PATH = 'true';
			(existsSync as Mock)
				.mockReturnValueOnce(true) // old path exists
				.mockReturnValueOnce(false); // new path does not exist

			Container.get(StorageConfig);

			expect(renameSync).toHaveBeenCalledWith('~/.pong/binaryData', '~/.pong/storage');
			expect(markFsStorageMigrated).toHaveBeenCalled();
		});

		it('should skip if already migrated', () => {
			mockInstance(InstanceSettings, {
				pongFolder,
				fsStorageMigrated: true,
				markFsStorageMigrated,
			});

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
			expect(markFsStorageMigrated).not.toHaveBeenCalled();
		});

		it('should skip if `PONG_STORAGE_PATH` is set', () => {
			process.env.PONG_STORAGE_PATH = '/custom/path';

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
		});

		it('should skip if `PONG_BINARY_DATA_STORAGE_PATH` is set', () => {
			process.env.PONG_BINARY_DATA_STORAGE_PATH = '/custom/path';

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
		});

		it('should skip if `binaryData` does not exist', () => {
			(existsSync as Mock).mockReturnValueOnce(false); // old path does not exist

			Container.get(StorageConfig);

			expect(renameSync).not.toHaveBeenCalled();
		});

		it('should error if `storage` already exists when migration is enabled', () => {
			process.env.PONG_MIGRATE_FS_STORAGE_PATH = 'true';
			(existsSync as Mock)
				.mockReturnValueOnce(true) // old path exists
				.mockReturnValueOnce(true); // new path also exists

			expect(() => Container.get(StorageConfig)).toThrow(StoragePathError);
			expect(renameSync).not.toHaveBeenCalled();
		});

		it.each(['ENOENT', 'EEXIST'])('should ignore `%s` error', (code) => {
			process.env.PONG_MIGRATE_FS_STORAGE_PATH = 'true';
			(existsSync as Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);
			(renameSync as Mock).mockImplementation(() => {
				throw Object.assign(new Error(code), { code });
			});

			expect(() => Container.get(StorageConfig)).not.toThrow();
		});

		it('should rethrow other errors', () => {
			process.env.PONG_MIGRATE_FS_STORAGE_PATH = 'true';
			(existsSync as Mock)
				.mockReturnValueOnce(true) // old path exists
				.mockReturnValueOnce(false); // new path does not exist
			const otherError = Object.assign(new Error('EACCES'), { code: 'EACCES' });
			(renameSync as Mock).mockImplementation(() => {
				throw otherError;
			});

			expect(() => Container.get(StorageConfig)).toThrow(otherError);
		});
	});
});
