import { Config, Env } from '@pong/config';

const MiB = 1024 * 1024;

@Config
export class PackageImportConfig {
	/** Maximum total uncompressed size in bytes for a package. */
	@Env('PONG_IMPORT_MAX_UNCOMPRESSED_BYTES')
	maxUncompressedBytes: number = 300 * MiB;

	/** Maximum uncompressed size in bytes for a single entry. */
	@Env('PONG_IMPORT_MAX_ENTRY_BYTES')
	maxEntryBytes: number = 5 * MiB;

	/** Maximum number of entries in a package. */
	@Env('PONG_IMPORT_MAX_ENTRIES')
	maxEntries: number = 5_000;

	/** Maximum length in characters of a single entry path. */
	@Env('PONG_IMPORT_MAX_PATH_LENGTH')
	maxPathLength: number = 1024;
}
