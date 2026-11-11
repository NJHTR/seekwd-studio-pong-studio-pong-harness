import { capabilities, capabilityRegistry } from '@pong/frontend-module-sdk';
import { getResourcePermissions } from '@pong/permissions';

export function getAppPermissions(projectId: string) {
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);
	const app = getResourcePermissions(permissions.scopesFor(projectId)).app;

	return {
		canCreate: !permissions.isReadOnly() && Boolean(app?.create),
		canList: Boolean(app?.list),
		canRead: Boolean(app?.read),
		canUpdate: !permissions.isReadOnly() && Boolean(app?.update),
		canDelete: !permissions.isReadOnly() && Boolean(app?.delete),
	};
}
