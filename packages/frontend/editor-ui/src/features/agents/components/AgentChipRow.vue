<script setup lang="ts">
import { PongButton, PongIcon, PongText, PongTooltip } from '@pong/design-system';

const props = withDefaults(
	defineProps<{
		label: string;
		itemCount: number;
		addLabel: string;
		addButtonTestId?: string;
		disabled?: boolean;
		showLabel?: boolean;
	}>(),
	{
		addButtonTestId: undefined,
		disabled: false,
		showLabel: true,
	},
);

defineSlots<{
	default?: () => unknown;
	extra?: () => unknown;
}>();

const emit = defineEmits<{
	add: [];
}>();
</script>

<template>
	<div :class="$style.row" :inert="props.disabled || undefined">
		<PongText v-if="props.showLabel && props.itemCount > 0" bold :class="$style.label">
			{{ props.label }}
		</PongText>

		<div :class="$style.content">
			<div :class="$style.chips">
				<slot />

				<PongTooltip v-if="props.itemCount > 0" :content="props.addLabel" placement="top">
					<PongButton
						variant="ghost"
						size="medium"
						icon-only
						:aria-label="props.addLabel"
						:disabled="props.disabled"
						:data-testid="props.addButtonTestId"
						@click="emit('add')"
					>
						<template #icon>
							<PongIcon icon="plus" :size="16" color="text-light" />
						</template>
					</PongButton>
				</PongTooltip>

				<PongButton
					v-else
					:class="$style.emptyAddButton"
					variant="ghost"
					size="medium"
					:disabled="props.disabled"
					:data-testid="props.addButtonTestId"
					@click="emit('add')"
				>
					<template #icon>
						<PongIcon icon="plus" :size="16" />
					</template>
					{{ props.addLabel }}
				</PongButton>
			</div>

			<div v-if="$slots.extra" :class="$style.extra">
				<slot name="extra" />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.label {
	opacity: var(--agent-row-label-opacity, 1);
	--pong--row-label-width: max(7%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	flex: 0 0 var(--pong--row-label-width);
	line-height: var(--line-height--sm);
	margin-top: var(--spacing--3xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.emptyAddButton {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));

	/** TODO: Consider making this style a generic PongButton style. DS-652 **/
	&:hover {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}

.extra {
	min-width: 0;
}

@media (max-width: 768px) {
	.row {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.label {
		flex-basis: auto;
		line-height: var(--line-height--sm);
	}
}
</style>
