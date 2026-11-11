<script setup lang="ts">
import {
	PongActionToggle,
	PongButton,
	PongIcon,
	PongIconButton,
	PongSettingsRow,
	PongStatusDot,
	PongText,
	type StatusDotVariant,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';

import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import { promotionEnvironmentBranch, promotionProviderIcon } from '../promotionsSettings.utils';
import ApplyInstanceDialog from './ApplyInstanceDialog.vue';
import PromoteInstanceDialog from './PromoteInstanceDialog.vue';
import PromotionMissingProjectsButton from './PromotionMissingProjectsButton.vue';

const props = defineProps<{
	environment: PromotionEnvironment;
	busy?: 'retry' | 'remove';
	connectError?: string;
	canConnect: boolean;
}>();

const emit = defineEmits<{
	retry: [];
	edit: [];
	remove: [];
}>();

const i18n = useI18n();
const { permissions } = usePromotionCheckout();

const dialogOpen = ref(false);

const branch = computed(() => promotionEnvironmentBranch(props.environment));

const status = computed(() => {
	const { hasCheckout, matchesEnvironment } = props.environment.checkout;
	if (!hasCheckout) return 'notConnected';
	return matchesEnvironment ? 'connected' : 'outOfDate';
});

const statusDotVariant: Record<typeof status.value, StatusDotVariant> = {
	connected: 'success',
	outOfDate: 'warning',
	notConnected: 'danger',
};

const canRun = computed(() =>
	props.environment.direction === 'apply' ? !!permissions.value.apply : !!permissions.value.promote,
);

const actions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: 'edit' as const },
	{
		label: i18n.baseText('settings.promotions.environment.remove'),
		value: 'remove' as const,
		destructive: true,
	},
]);

function onAction(action: 'edit' | 'remove') {
	if (action === 'edit') emit('edit');
	else emit('remove');
}
</script>

<template>
	<div>
		<PongSettingsRow
			:title="i18n.baseText(`settings.promotions.environments.${environment.direction}.title`)"
			:show-divider="false"
		>
			<template #action>
				<PongActionToggle
					:actions="actions"
					:disabled="!!busy"
					data-test-id="promotion-environment-menu"
					@action="onAction"
				>
					<PongIconButton
						variant="ghost"
						icon="ellipsis"
						size="small"
						:disabled="!!busy"
						:aria-label="i18n.baseText('settings.promotions.environment.menu')"
					/>
				</PongActionToggle>
			</template>
		</PongSettingsRow>
		<PongSettingsRow :show-divider="false">
			<template #info>
				<PongText bold color="text-dark">{{ environment.name }}</PongText>
				<PongText :class="$style.remote" size="small" color="text-light">
					{{
						i18n.baseText('settings.promotions.environment.remoteSummary', {
							interpolate: {
								type: i18n.baseText(
									`settings.promotions.providers.type.${environment.provider.type}`,
								),
								remoteUrl: environment.remote.remoteUrl,
								branch,
							},
						})
					}}
				</PongText>
				<div role="status" :class="$style.status" data-test-id="promotion-environment-status">
					<div :class="$style.state">
						<PongStatusDot :variant="statusDotVariant[status]" />
						<PongText size="small" color="text-dark">
							{{ i18n.baseText(`settings.promotions.environment.status.${status}`) }}
						</PongText>
					</div>
					<PongText v-if="status === 'outOfDate'" size="small" color="warning">
						{{ i18n.baseText('settings.promotions.environment.status.outOfDate.description') }}
					</PongText>
					<PongText v-if="status !== 'connected' && connectError" size="small" color="danger">
						{{ connectError }}
					</PongText>
				</div>
			</template>
			<template #visual>
				<PongIcon
					:icon="promotionProviderIcon[environment.provider.type]"
					color="text-dark"
					size="xlarge"
				/>
			</template>
		</PongSettingsRow>
		<!-- No info here: the buttons get the whole row. -->
		<PongSettingsRow :show-divider="false" :action-max-width="false">
			<template #action>
				<div :class="$style.actions">
					<PongButton
						v-if="status !== 'connected' && canConnect"
						variant="outline"
						size="small"
						:loading="busy === 'retry'"
						:disabled="busy === 'remove'"
						data-test-id="promotion-environment-retry"
						@click="emit('retry')"
					>
						{{
							i18n.baseText(
								status === 'outOfDate'
									? 'settings.promotions.environment.reconnect'
									: 'generic.retry',
							)
						}}
					</PongButton>
					<PromotionMissingProjectsButton
						v-if="environment.direction === 'apply'"
						:environment-id="environment.id"
						:environment-name="environment.name"
						:connected="status === 'connected'"
						:busy="!!busy"
					/>
					<PongButton
						v-if="canRun"
						size="small"
						:disabled="status !== 'connected' || !!busy"
						:data-test-id="`${environment.direction}-instance-button`"
						@click="dialogOpen = true"
					>
						{{ i18n.baseText(`settings.promotions.${environment.direction}.button`) }}
					</PongButton>
				</div>
			</template>
		</PongSettingsRow>

		<PromoteInstanceDialog
			v-if="dialogOpen && environment.direction === 'promote'"
			:open="dialogOpen"
			:environment-id="environment.id"
			:base-branch-name="environment.settings.baseBranchName"
			:environment-name="environment.name"
			:create-branch-on-promotion="environment.settings.createBranchOnPromotion"
			:provider-type="environment.provider.type"
			@update:open="dialogOpen = $event"
		/>
		<ApplyInstanceDialog
			v-if="dialogOpen && environment.direction === 'apply'"
			:open="dialogOpen"
			:environment-id="environment.id"
			:branch-name="environment.settings.branchName"
			:environment-name="environment.name"
			@update:open="dialogOpen = $event"
		/>
	</div>
</template>

<style lang="scss" module>
.remote {
	overflow-wrap: anywhere;
}

.status {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-block-start: var(--spacing--3xs);
}

.state {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
