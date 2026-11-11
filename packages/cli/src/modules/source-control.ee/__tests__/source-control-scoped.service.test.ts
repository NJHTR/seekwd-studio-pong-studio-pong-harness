import type { AuthenticatedRequest, Project } from '@pong/db';
import { hasGlobalScope } from '@pong/permissions';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@pong/errors';

import type { SourceControlContextFactory } from '../source-control-context.factory';
import { SourceControlScopedService } from '../source-control-scoped.service';
import type { SourceControlContext } from '../types/source-control-context';

vi.mock('@pong/permissions', async () => ({
	...(await vi.importActual<typeof import('@pong/permissions')>('@pong/permissions')),
	hasGlobalScope: vi.fn(),
}));

describe('SourceControlScopedService', () => {
	const contextFactory = mock<SourceControlContextFactory>();
	const service = new SourceControlScopedService(contextFactory, mock());

	const req = mock<AuthenticatedRequest>({ user: {} });

	beforeEach(() => {
		vi.mocked(hasGlobalScope).mockReset().mockReturnValue(false);
		contextFactory.createContext.mockReset();
	});

	describe('ensureIsAllowedToGetStatus', () => {
		it('should allow callers holding any global source control scope without touching projects', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			await expect(service.ensureIsAllowedToGetStatus(req)).resolves.toBeUndefined();

			expect(hasGlobalScope).toHaveBeenCalledWith(req.user, [
				'sourceControl:pull',
				'sourceControl:push',
				'sourceControl:manage',
			]);
			expect(contextFactory.createContext).not.toHaveBeenCalled();
		});

		it('should allow project-level push admins (authorized projects present)', async () => {
			contextFactory.createContext.mockResolvedValue(
				mock<SourceControlContext>({ authorizedProjects: [mock<Project>()] }),
			);

			await expect(service.ensureIsAllowedToGetStatus(req)).resolves.toBeUndefined();
		});

		it('should reject callers with no global scope and no authorized projects', async () => {
			contextFactory.createContext.mockResolvedValue(
				mock<SourceControlContext>({ authorizedProjects: [] }),
			);

			await expect(service.ensureIsAllowedToGetStatus(req)).rejects.toThrow(ForbiddenError);
		});
	});

	describe('getCredentialsInAdminProjectsFromContextFilter', () => {
		const context = mock<SourceControlContext>({
			user: req.user,
			hasAccessToAllProjects: () => true,
		});

		it('excludes instance credentials regardless of the instance credential scope', () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			expect(service.getCredentialsInAdminProjectsFromContextFilter(context)).toEqual({
				usageScope: 'project',
			});
		});
	});
});
