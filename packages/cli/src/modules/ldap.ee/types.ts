import type { LdapConfig } from '@pong/constants';
import type { AuthenticatedRequest, RunningMode } from '@pong/db';

export declare namespace LdapConfiguration {
	type Update = AuthenticatedRequest<{}, {}, LdapConfig, {}>;
	type Sync = AuthenticatedRequest<{}, {}, { type: RunningMode }, {}>;
	type GetSync = AuthenticatedRequest<{}, {}, {}, { page?: string; perPage?: string }>;
}
