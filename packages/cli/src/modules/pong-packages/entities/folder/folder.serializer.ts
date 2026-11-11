import { type SerializedFolder, serializedFolderSchema } from '@pong/api-types';
import type { Folder } from '@pong/db';
import { Service } from '@pong/di';

import { definePackageSerializationPayload } from '../package-serialization.types';

type FolderPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	parentFolderId: 'transform';
	parentFolder: 'exclude';
	subFolders: 'exclude';
	homeProject: 'transform';
	workflows: 'exclude';
	tags: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	Folder,
	SerializedFolder,
	FolderPackageKeyHandling
>();

@Service()
export class FolderSerializer {
	serialize(folder: Folder, parentFolderId: string | null): SerializedFolder {
		return serializedFolderSchema.parse(
			serializePayload({
				id: folder.id,
				name: folder.name,
				parentFolderId,
			}),
		);
	}
}
