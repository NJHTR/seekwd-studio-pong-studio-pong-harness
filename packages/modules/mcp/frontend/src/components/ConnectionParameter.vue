<script setup lang="ts">
import { useI18n } from '@pong/i18n';
import { useClipboard } from '@pong/composables/useClipboard';
import { PongButton, PongTooltip, PongInfoTip, PongInput, PongLoading } from '@pong/design-system';
import { MCP_TOOLTIP_DELAY } from '../mcp.constants';

type Props = {
	id: string;
	label: string;
	value: string;
	valueLoading?: boolean;
	infoTip?: string;
	allowCopy?: boolean;
};

const { copy, copied, isSupported } = useClipboard();
const i18n = useI18n();

const props = withDefaults(defineProps<Props>(), {
	allowCopy: true,
	maxWidth: undefined,
	infoTip: undefined,
	valueLoading: false,
});

const emit = defineEmits<{
	copy: [value: string];
}>();

const handleCopy = async (value: string) => {
	await copy(value);
	emit('copy', value);
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style['label-wrapper']">
			<label :class="$style.label" :for="`connection-parameter-${props.id}`">
				{{ props.label }}
			</label>
			<div v-if="props.infoTip" :class="$style['info-tip']">
				<PongInfoTip type="tooltip" size="small" :enterable="false">
					{{ props.infoTip }}
				</PongInfoTip>
			</div>
		</div>
		<div
			:id="`connection-parameter-${props.id}`"
			:class="{
				[$style['parameter-value']]: true,
				[$style['parameter-value--loading']]: props.valueLoading,
			}"
			data-test-id="connection-parameter-value"
		>
			<div :class="$style['input-wrapper']">
				<PongLoading
					v-if="props.valueLoading"
					:loading="props.valueLoading"
					variant="h1"
					:class="$style['parameter-skeleton']"
				/>
				<PongInput v-else v-model="props.value" type="text" :readonly="true" />
			</div>
			<div :class="$style['copy-button-wrapper']">
				<slot name="customActions" />
				<PongTooltip
					:disabled="!isSupported"
					:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
					:show-after="MCP_TOOLTIP_DELAY"
					placement="bottom"
				>
					<PongButton
						v-if="props.allowCopy && isSupported"
						variant="outline"
						icon-only
						:icon="copied ? 'check' : 'copy'"
						:class="$style['copy-button']"
						:disabled="props.valueLoading"
						@click="handleCopy(props.value)"
					/>
				</PongTooltip>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.label-wrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);

	.info-tip {
		visibility: hidden;
		cursor: pointer;
		padding-top: 1px;

		:global(.pong-info-tip) {
			display: flex;
		}
	}

	&:hover .info-tip span {
		visibility: visible;
	}
}

.label {
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.parameter-value {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	gap: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;

	&--loading {
		gap: 0;
	}

	.input-wrapper {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;

		:global(.pong-input__wrapper) {
			--input--border--shadow: 0 0 0 0 transparent;
			--input--border--shadow--hover: 0 0 0 0 transparent;
			--input--border--shadow--focus: 0 0 0 0 transparent;

			&:focus-within {
				outline: none;
			}
		}
	}

	:global(.pong-input) {
		flex: 1;
		align-items: center;

		input {
			font-family: monospace;
			font-size: var(--font-size--2xs);
			border: none;
			color: var(--color--text);
			min-height: var(--spacing--md);
			height: var(--spacing--md);
		}
	}

	.parameter-skeleton div {
		margin: 0;
		height: calc(var(--spacing--xl) - 2 * var(--border-width));
		border-radius: 0 0 var(--radius) var(--radius);
	}

	button {
		height: auto;
		border-radius: 0;
	}

	button + button {
		border-left: var(--border);
	}

	@media screen and (max-width: 820px) {
		word-wrap: break-word;
		margin-top: var(--spacing--2xs);
	}
}

.copy-button-wrapper {
	display: flex;
	align-items: stretch;
	border-left: var(--border);

	// Tooltip triggers wrap each button in a span, which must stretch it too.
	> span {
		display: flex;
	}
}

.copy-button {
	border-radius: 0;
}
</style>
