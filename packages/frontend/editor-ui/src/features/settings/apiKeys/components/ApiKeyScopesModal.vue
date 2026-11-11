<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@pong/i18n';
import type { ApiKey } from '@pong/api-types';
import { PongDialog, PongDialogBody, PongText } from '@pong/design-system';

const props = defineProps<{
	apiKey: ApiKey | null;
	open: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();

const title = computed(() =>
	props.apiKey
		? i18n.baseText('settings.api.scopes.modal.title', {
				interpolate: { label: props.apiKey.label },
			})
		: '',
);

const scopes = computed(() => props.apiKey?.scopes ?? []);
</script>

<template>
	<PongDialog
		:open="open"
		:header="title"
		size="medium"
		data-test-id="api-key-scopes-modal"
		@update:open="emit('update:open', $event)"
	>
		<PongDialogBody :class="$style.body">
			<PongText v-if="!scopes.length" size="small" color="text-light">
				{{ i18n.baseText('settings.api.scopes.modal.empty') }}
			</PongText>
			<ul v-else :class="$style.pills">
				<li v-for="scope in scopes" :key="scope" :class="$style.pill">
					{{ scope }}
				</li>
			</ul>
		</PongDialogBody>
	</PongDialog>
</template>

<style lang="scss" module>
.body {
	max-height: 50vh;
}

.pills {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.pill {
	background-color: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}
</style>
