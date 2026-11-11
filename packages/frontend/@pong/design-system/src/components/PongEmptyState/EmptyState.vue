<script lang="ts" setup>
import EmptyStateIconCards from './EmptyStateIconCards.vue';
import type { EmptyStateIconCards as EmptyStateIconCardsIcon } from './types';
import type { ButtonVariant } from '../../types/button';
import PongButton from '../PongButton';
import PongCallout, { type CalloutTheme } from '../PongCallout';
import PongHeading from '../PongHeading';
import PongIcon from '../PongIcon';
import { type IconName } from '../PongIcon/icons';
import type { IconOrEmoji } from '../PongIconPicker/types';
import PongText from '../PongText';
import PongTooltip from '../PongTooltip/Tooltip.vue';

interface EmptyStateProps {
	icon?: IconOrEmoji | EmptyStateIconCardsIcon;
	heading?: string;
	buttonText?: string;
	buttonVariant?: ButtonVariant;
	buttonDisabled?: boolean;
	buttonIcon?: IconName;
	description?: string;
	calloutText?: string;
	calloutTheme?: CalloutTheme;
	calloutIcon?: IconName;
}

defineOptions({ name: 'PongEmptyState' });
withDefaults(defineProps<EmptyStateProps>(), {
	calloutTheme: 'info',
	buttonIcon: undefined,
});
</script>

<template>
	<div :class="['pong-empty-state', $style.container]" data-test-id="empty-state">
		<div v-if="icon" :class="$style.icon">
			<EmptyStateIconCards
				v-if="icon.type === 'cards'"
				:center-icon="icon.center"
				:side-icons="icon.sides"
				:animated="icon.animated ?? true"
			/>
			<PongIcon
				v-else-if="icon.type === 'icon'"
				:icon="icon.value"
				:size="40"
				:stroke-width="1.5"
				color="foreground-xdark"
			/>
			<span v-else>{{ icon.value }}</span>
		</div>
		<div v-if="heading || $slots.heading || description" :class="$style.text">
			<div v-if="heading || $slots.heading" :class="$style.heading">
				<PongHeading size="xlarge" align="center">
					<slot name="heading">{{ heading }}</slot>
				</PongHeading>
			</div>
			<div
				v-if="description"
				:class="$style.description"
				@click="$emit('descriptionClick', $event)"
			>
				<PongText color="text-base">
					<slot name="description">
						<span v-pong-html="description"></span>
					</slot>
				</PongText>
			</div>
		</div>
		<PongTooltip v-if="buttonText" :disabled="!buttonDisabled">
			<template #content>
				<slot name="disabledButtonTooltip"></slot>
			</template>
			<PongButton
				:label="buttonText"
				:variant="buttonVariant"
				:disabled="buttonDisabled"
				:icon="buttonIcon"
				size="large"
				role="button"
				@click="$emit('click:button', $event)"
			/>
		</PongTooltip>
		<div v-if="$slots.additionalContent" :class="$style['additional-content']">
			<slot name="additionalContent"></slot>
		</div>
		<PongCallout
			v-if="calloutText"
			:theme="calloutTheme"
			:icon="calloutIcon"
			:class="$style.callout"
		>
			<PongText color="text-base">
				<span v-pong-html="calloutText" size="small"></span>
			</PongText>
		</PongCallout>
	</div>
</template>

<style lang="scss" module>
.container {
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--3xl) var(--spacing--xl);
}

.icon {
	font-size: 40px;
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: 32rem;
}

.heading {
	text-align: center;
}

.description {
	color: var(--color--text);
	text-align: center;
}

.callout {
	width: 100%;
	text-align: left;
}

.additional-content {
	display: flex;
	margin-top: 0;
	justify-content: center;
}
</style>
