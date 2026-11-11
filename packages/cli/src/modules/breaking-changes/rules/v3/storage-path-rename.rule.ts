import { BreakingChangeRule } from '@pong/decorators';
import { InstanceSettings } from 'pong-core';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class StoragePathRenameRule implements IBreakingChangeInstanceRule {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	id: string = 'storage-path-rename-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Filesystem storage directory is renamed',
			description:
				'The filesystem storage directory `~/.pong/binaryData` is renamed to `~/.pong/storage` on the first start of the new version.',
			category: BreakingChangeCategory.infrastructure,
			impact: 'behaviorChanges',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const notAffected = { isAffected: false, instanceIssues: [], recommendations: [] };

		if (this.instanceSettings.fsStorageMigrated) return notAffected;
		if (process.env.PONG_STORAGE_PATH || process.env.PONG_BINARY_DATA_STORAGE_PATH) {
			return notAffected;
		}

		const { pongFolder } = this.instanceSettings;
		const oldPath = path.join(pongFolder, 'binaryData');
		const newPath = path.join(pongFolder, 'storage');

		if (!existsSync(oldPath)) return notAffected;

		if (existsSync(newPath)) {
			return {
				isAffected: true,
				instanceIssues: [
					{
						title: 'Both storage directories exist',
						description: `Both "${oldPath}" and "${newPath}" exist. The new version cannot rename "${oldPath}" and fails to start.`,
						level: 'error',
					},
				],
				recommendations: [
					{
						action: 'Resolve the directory conflict',
						description: `Before you update, move the contents of "${oldPath}" into "${newPath}" and remove "${oldPath}", or set PONG_STORAGE_PATH to the directory you want to use.`,
					},
				],
			};
		}

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Storage directory will be renamed',
					description: `"${oldPath}" is renamed to "${newPath}" on the first start of the new version.`,
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Update volume mounts',
					description: `If you mount a volume at "${oldPath}", mount it at "${newPath}" instead, or set PONG_STORAGE_PATH to the old path to keep it.`,
				},
			],
		};
	}
}
