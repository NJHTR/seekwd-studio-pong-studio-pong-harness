import {
	promotionProviderTypeCapabilities,
	type PromotionGitHostConfig,
	type PromotionProviderConfig,
} from '@pong/api-types';
import { ProjectRepository, type User } from '@pong/db';
import { Container } from '@pong/di';
import { Cipher } from 'pong-core';
import { rm } from 'node:fs/promises';

import { PongPackagesService } from '@/modules/pong-packages/pong-packages.service';

import { PromotionProviderRepository } from '../../database/repositories/promotion-provider.repository';
import { instancePromotionExportRequest } from '../../instance-package';

/** Stores a token provider as the providers API does, without the checks against the host. */
export async function insertTokenProvider({
	name,
	type = 'git',
	config = { schemaVersion: 1 },
	username = 'test',
	password = 'test',
}: {
	name: string;
	username?: string;
	password?: string;
} & (
	| { type?: 'git'; config?: PromotionProviderConfig }
	| { type: 'gitlab'; config: PromotionGitHostConfig }
)) {
	const credentials = {
		schemaVersion: 1,
		username: promotionProviderTypeCapabilities[type].tokenUsername ?? username,
		password,
	};
	return await Container.get(PromotionProviderRepository).insertProvider({
		name,
		type,
		authType: 'token',
		config,
		auth: await Container.get(Cipher).encryptV2(JSON.stringify(credentials)),
	});
}

/** Writes the package that an instance Promote exports, without the Git work of Promote. */
export async function writeInstancePromotionPackage(user: User, targetDir: string) {
	await rm(targetDir, { recursive: true, force: true });
	await Container.get(PongPackagesService).exportPackageToDirectory(
		instancePromotionExportRequest({
			user,
			projectIds: await Container.get(ProjectRepository).findTeamProjectIds(),
			canExportVariableValues: true,
		}),
		{ targetDir },
	);
}
