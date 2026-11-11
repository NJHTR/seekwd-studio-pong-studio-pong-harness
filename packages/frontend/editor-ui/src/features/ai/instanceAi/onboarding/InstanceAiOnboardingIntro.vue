<script setup lang="ts">
import {
	PongButton,
	PongHeading,
	PongIcon,
	PongSettingsRow,
	PongSettingsRowConfigure,
	PongSettingsRowGroup,
	PongText,
} from '@pong/design-system';
import { useI18n } from '@pong/i18n';

defineProps<{
	incomplete: boolean;
	connectModelOnly: boolean;
	returnVisit: boolean;
	modelValue: string;
	sandboxValue: string;
	searchValue: string;
}>();

const emit = defineEmits<{
	setup: [];
	setupLater: [];
	openStep: [step: 'model' | 'sandbox' | 'search'];
	turnOff: [];
}>();

const i18n = useI18n();
</script>

<template>
	<div
		:class="$style.page"
		:data-test-id="incomplete ? 'assistant-setup-incomplete' : 'assistant-setup-intro'"
	>
		<div :class="[$style.content, incomplete && $style.wide]">
			<PongIcon icon="pong-assistant" :size="32" :class="$style.heroIcon" />
			<PongHeading tag="h1" size="2xlarge" bold :class="$style.title">
				{{ i18n.baseText('instanceAi.onboarding.title') }}
			</PongHeading>

			<PongText v-if="incomplete" tag="p" color="text-base" size="large" :class="$style.lede">
				{{ i18n.baseText('instanceAi.onboarding.incomplete.lede') }}
			</PongText>

			<div v-if="!incomplete" :class="$style.benefits">
				<div :class="$style.benefit">
					<PongIcon icon="workflow" size="large" />
					<PongText size="large">{{ i18n.baseText('instanceAi.onboarding.benefit.build') }}</PongText>
				</div>
				<div :class="$style.benefit">
					<PongIcon icon="flask-conical" size="large" />
					<PongText size="large">{{ i18n.baseText('instanceAi.onboarding.benefit.debug') }}</PongText>
				</div>
				<div :class="$style.benefit">
					<PongIcon icon="circle-help" size="large" />
					<PongText size="large">{{ i18n.baseText('instanceAi.onboarding.benefit.help') }}</PongText>
				</div>
			</div>

			<PongSettingsRowGroup v-else :class="$style.checklist">
				<PongSettingsRow
					v-for="item in [
						{
							id: 'model' as const,
							title: i18n.baseText('instanceAi.onboarding.model.label'),
							description: i18n.baseText('instanceAi.onboarding.model.description'),
							value: modelValue,
						},
						{
							id: 'sandbox' as const,
							title: i18n.baseText('instanceAi.onboarding.sandbox.label'),
							description: i18n.baseText('instanceAi.onboarding.sandbox.description'),
							value: sandboxValue,
						},
						{
							id: 'search' as const,
							title: i18n.baseText('instanceAi.onboarding.search.label'),
							description: i18n.baseText('instanceAi.onboarding.search.description'),
							value: searchValue,
						},
					]"
					:key="item.id"
					:title="item.title"
					:description="item.description"
					clickable
					:data-test-id="`assistant-setup-checklist-${item.id}`"
					@click="emit('openStep', item.id)"
				>
					<template #action>
						<PongSettingsRowConfigure :value="item.value" />
					</template>
				</PongSettingsRow>
			</PongSettingsRowGroup>

			<div :class="$style.actions">
				<PongButton
					variant="solid"
					size="medium"
					:data-test-id="incomplete ? 'assistant-finish-setup-cta' : 'assistant-setup-cta'"
					:label="
						incomplete
							? i18n.baseText('instanceAi.onboarding.finishSetup')
							: connectModelOnly
								? i18n.baseText('instanceAi.onboarding.connectModel')
								: i18n.baseText('instanceAi.onboarding.setUp')
					"
					@click="emit('setup')"
				/>
				<PongButton
					v-if="!returnVisit"
					variant="ghost"
					size="medium"
					:label="i18n.baseText('instanceAi.onboarding.setUpLater')"
					data-test-id="assistant-set-up-later"
					@click="emit('setupLater')"
				/>
			</div>

			<div v-if="returnVisit" :class="$style.turnOff">
				<PongButton
					variant="ghost"
					size="small"
					:label="i18n.baseText('instanceAi.onboarding.turnOff.action')"
					:class="$style.turnOffButton"
					data-test-id="assistant-turn-off"
					@click="emit('turnOff')"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@pong/design-system/css/mixins/motion.scss' as motion;

.page {
	flex: 1;
	min-width: 0;
	overflow: auto;
	display: flex;
	justify-content: center;
	padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--3xl);
}

.content {
	@include motion.fade-in-up;

	width: 100%;
	max-width: 27.5rem;
	margin: auto 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.wide {
	max-width: 35rem;
}

.heroIcon {
	color: var(--icon-color);
}

.title {
	margin: var(--spacing--sm) 0 0;
}

.lede {
	margin: var(--spacing--sm) 0 0;
}

.benefits {
	margin-top: var(--spacing--md);
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	text-align: left;
}

.benefit {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.benefit svg {
	flex-shrink: 0;
	color: var(--icon-color);
}

.checklist {
	width: 100%;
	margin-top: var(--spacing--lg);
	text-align: start;
}

.actions {
	margin-top: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
}

.turnOff {
	width: auto;
	align-self: stretch;
	margin-inline: var(--spacing--lg);
	margin-top: var(--spacing--lg);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
	display: flex;
	justify-content: center;
}

.turnOffButton {
	color: var(--text-color--subtler);
}
</style>
