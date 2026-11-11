<script setup lang="ts">
import { PongLink } from '@pong/design-system';
import {
	ContactAdminModal,
	getViolationVerdict,
	useRestrictionContact,
	type RestrictedTypeKind,
} from '@pong/frontend-module-type-availability-policies';
import { useI18n } from '@pong/i18n';
import { computed, onMounted, ref } from 'vue';

import type { ToolPolicyRefusal } from '@/features/ai/shared/agentsChat/toolPolicyRefusal';

import { useToolPolicyRefusalText } from '../composables/useToolPolicyRefusalText';

const props = defineProps<{
	refusal: ToolPolicyRefusal;
	/** Names the subject when a violation does not. */
	fallbackName: string;
}>();

const i18n = useI18n();
const { subjectName, reason, loadSubjectTypes } = useToolPolicyRefusalText();

const isContactAdminOpen = ref(false);

const reasonText = computed(() =>
	[...new Set(props.refusal.violations.map((v) => reason(v, props.fallbackName)))].join(' '),
);

const firstViolation = computed(() => props.refusal.violations[0]);
const adminSubject = computed(() => subjectName(firstViolation.value) ?? props.fallbackName);
const adminSubjectKind = computed<RestrictedTypeKind>(() =>
	firstViolation.value.subjectType === 'credentialType' ? 'credential' : 'node',
);
const { copy: contactCopy } = useRestrictionContact(
	() => getViolationVerdict(firstViolation.value),
	() => firstViolation.value.projectId,
);

onMounted(() => {
	void loadSubjectTypes(props.refusal).catch(() => undefined);
});
</script>

<template>
	<span data-test-id="agent-chat-tool-policy-refusal">
		{{ reasonText }}
		<PongLink
			underline
			size="small"
			data-test-id="agent-chat-tool-policy-refusal-contact-admin"
			@click.prevent="isContactAdminOpen = true"
		>
			{{ i18n.baseText(contactCopy.action) }}
		</PongLink>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:type-name="adminSubject"
			:kind="adminSubjectKind"
			:audience="contactCopy.audience"
		/>
	</span>
</template>
