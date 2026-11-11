import type { FrontendModuleDescription } from '@pong/frontend-module-sdk';
import { DataTableModule } from '@/features/core/dataTable/module.descriptor';
import { MCPModule } from '@pong/frontend-module-mcp/mcp.module';
import { ChatModule } from '@/features/ai/chatHub/module.descriptor';
import { InstanceAiModule } from '@/features/ai/instanceAi/module.descriptor';
import { AgentsModule } from '@/features/agents/module.descriptor';
import { InboxModule } from '@pong/frontend-module-inbox';
import { InstanceRegistryModule } from '@pong/frontend-module-instance-registry';
import { OtelModule } from '@pong/frontend-module-otel';
import { InsightsModule } from '@pong/frontend-module-insights/insights.module';
import { PromotionsModule } from '@pong/frontend-module-promotions/promotions.module';
import { ContextModule } from '@/features/settings/context/module.descriptor';
import { LogStreamingModule } from '@/features/integrations/logStreaming.ee/module.descriptor';
import { TypeAvailabilityPoliciesModule } from '@pong/frontend-module-type-availability-policies';
import { AppsModule } from '@pong/frontend-module-apps';

/**
 * The static list is the design, not a placeholder (design §9). pong self-hosted
 * ships one artifact, and module availability is enforced by the backend — the
 * `licenseFlag` plus the `isModuleActive` route middleware — so a disabled
 * module's code on disk is inert bytes, not a leak. Fetching module bundles at
 * runtime would buy nothing and cost real failure modes: a chunk 404 after a
 * rolling deploy, a second vue/pinia instance, and boot ordering that races
 * `/rest/module-settings` against pre-mount route registration.
 *
 * Build-time per-module chunks are the open question, not runtime loading. Once
 * every descriptor is import-light, this array can become a static map of
 * dynamic imports and Vite emits one chunk per module. That is decided at
 * wave-2 exit, with bundle-analysis data.
 *
 * Add a module here through the scaffolder (`pnpm pong-module-sdk create`).
 */
export const modules: FrontendModuleDescription[] = [
	DataTableModule,
	MCPModule,
	ChatModule,
	InstanceAiModule,
	AgentsModule,
	OtelModule,
	InboxModule,
	InstanceRegistryModule,
	InsightsModule,
	PromotionsModule,
	ContextModule,
	TypeAvailabilityPoliciesModule,
	LogStreamingModule,
	AppsModule,
];
