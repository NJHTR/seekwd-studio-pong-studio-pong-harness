# @pong/blob-storage

Blob storage layer for pong. Hosts the external-storage clients used to persist blobs (execution data, binary data) outside the database:

- `ObjectStoreService` (`@pong/blob-storage/object-store`): S3-compatible object storage
- `AzureBlobService` (`@pong/blob-storage/azure-blob`): Azure Blob Storage

The root entrypoint is free of cloud SDK imports: it exposes only types, configs, and stream utilities. The services live behind the subpath exports above and are meant to be loaded with `await import()` so the S3/Azure SDKs are pulled in only when external storage is configured.
