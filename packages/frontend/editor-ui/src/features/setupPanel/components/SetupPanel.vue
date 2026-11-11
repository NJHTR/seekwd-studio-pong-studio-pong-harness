<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@pong/i18n';
import { PongSwitch, PongText } from '@pong/design-system';
import SetupPanelCards from '@/features/setupPanel/components/SetupPanelCards.vue';

const i18n = useI18n();
const showCompleted = ref(true);
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-container">
		<div :class="$style.content" data-test-id="setup-panel-cards">
			<SetupPanelCards :show-completed="showCompleted" />
		</div>
		<footer :class="$style.footer" data-test-id="setup-panel-footer">
			<PongText :class="$style['toggle-label']" tag="label" size="small">
				<PongSwitch v-model="showCompleted" size="small" />
				{{ i18n.baseText('setupPanel.showCompleted') }}
			</PongText>
		</footer>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	height: 100%;
	width: 100%;
	flex-direction: column;
	justify-content: center;
	background-color: var(--color--background--light-2);
	position: relative;
	top: calc(-1 * var(--spacing--5xs));
}

.content {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs);
	gap: var(--spacing--sm);
	overflow-y: auto;
	overflow-x: hidden;
	flex: 1;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	margin-top: auto;
	background-color: var(--color--background--light-2);
	border-top: var(--border);
}

.toggle-label {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	user-select: none;
}
</style>
