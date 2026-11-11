<script setup lang="ts">
import { PongButton, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';

import ContactAdminModal from './ContactAdminModal.vue';
import {
	describeNodeTypeRestriction,
	useRestrictionContact,
	type OptionalVerdict,
} from '../composables/useNodeTypeRestriction';

const {
	nodeTypeName,
	restriction,
	showReplace = true,
} = defineProps<{
	nodeTypeName: string;
	restriction?: OptionalVerdict;
	showReplace?: boolean;
}>();

const emit = defineEmits<{ replaceNode: [] }>();

const i18n = useI18n();

const isContactAdminOpen = ref(false);

const { copy: contactCopy } = useRestrictionContact(() => restriction);
const description = computed(() =>
	describeNodeTypeRestriction(nodeTypeName, restriction, showReplace ? 'replace' : 'contact'),
);
</script>

<template>
	<div :class="$style.panel" data-test-id="node-restricted-panel">
		<PongIcon icon="lock" :class="$style.icon" />
		<PongText size="large" color="text-dark" bold :class="$style.title">
			{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.title') }}
		</PongText>
		<PongText :class="$style.description">{{ description }}</PongText>
		<div :class="$style.actions">
			<PongButton
				variant="solid"
				size="small"
				icon="mail"
				data-test-id="node-restricted-contact-admin"
				@click="isContactAdminOpen = true"
			>
				{{ i18n.baseText(contactCopy.action) }}
			</PongButton>
			<PongButton
				v-if="showReplace"
				variant="outline"
				size="small"
				icon="arrow-left-right"
				data-test-id="node-restricted-replace"
				@click="emit('replaceNode')"
			>
				{{ i18n.baseText('typeAvailabilityPolicies.restrictedNode.replaceNode') }}
			</PongButton>
		</div>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:type-name="nodeTypeName"
			:audience="contactCopy.audience"
		/>
	</div>
</template>

<style lang="scss" module>
.panel {
	height: 75%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xs);
	text-align: center;
	line-height: var(--line-height--md);
}

.icon {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--2xl);
}

.title {
	margin-top: var(--spacing--sm);
	margin-bottom: var(--spacing--xs);
}

.description {
	margin-bottom: var(--spacing--2xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
