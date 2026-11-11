import { getPersonalProject, testDb } from '@pong/backend-test-utils';
import { Container } from '@pong/di';

import { SourceControlContextFactory } from '@/modules/source-control.ee/source-control-context.factory';

import { createMember, createOwner } from '../shared/db/users';

describe('SourceControlContextFactory', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Project', 'User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('finds a personal project by the email of its owner', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const memberProject = await getPersonalProject(member);

		const context = await Container.get(SourceControlContextFactory).createContext(owner);

		expect(context.findAuthorizedProjectByOwner(member.email)?.id).toBe(memberProject.id);
		expect(
			context.findAuthorizedProjectByOwner({ type: 'personal', personalEmail: member.email })?.id,
		).toBe(memberProject.id);
	});
});
