<script setup lang="ts">
import { POLICY_VIOLATION_SUBJECT_TYPE, type PolicyViolation } from '@pong/api-types';
import {
	PongButton,
	PongDialog,
	PongDialogBody,
	PongDialogDescription,
	PongDialogFooter,
	PongText,
} from '@pong/design-system';
import { useI18n, type BaseTextKey } from '@pong/i18n';
import { getProject, type Project } from '@pong/rest-api-client';
import { useRootStore } from '@pong/stores/useRootStore';
import { computed, ref, shallowReactive, shallowRef, watch } from 'vue';

import ContactAdminModal from '../components/ContactAdminModal.vue';
import RestrictedNodePopover from '../components/RestrictedNodePopover.vue';
import { useCloseOnEscape } from '../composables/useCloseOnEscape';
import {
	getViolationVerdict,
	resolveRestrictionContact,
	sharedRestrictionContact,
} from '../composables/useNodeTypeRestriction';
import {
	RESTRICTION_CONTACT_COPY,
	type ContactAudience,
	type RestrictedTypeKind,
} from '../type-availability-policies.constants';

const { violations, projectId, projectName, labelOf } = defineProps<{
	violations: PolicyViolation[];
	/** The move destination. Its type and admins decide whom to contact. */
	projectId: string;
	projectName: string;
	labelOf: (violation: PolicyViolation) => string | undefined;
}>();

defineSlots<{ icon(props: { violation: PolicyViolation }): unknown }>();

const open = defineModel<boolean>('open', { default: false });

const i18n = useI18n();

const isContactAdminOpen = ref(false);

// The contact dialog takes Escape while it is open, so one press closes only the top dialog.
useCloseOnEscape(
	() => open.value && !isContactAdminOpen.value,
	() => (open.value = false),
);

// Loaded on mount, so the contact copy is right when the dialog opens. Until it loads, or if
// it fails, the copy names the instance admin.
const destination = shallowRef<Project | null>(null);
watch(
	() => projectId,
	async (id) => {
		destination.value = null;
		const project = await getProject(useRootStore().restApiContext, id).catch(() => null);
		if (id === projectId) destination.value = project;
	},
	{ immediate: true },
);
const destinationType = computed(() => destination.value?.type ?? null);

function nameOf(violation: PolicyViolation): string {
	return labelOf(violation) ?? violation.subject ?? violation.message;
}

function kindOf(violation: PolicyViolation): RestrictedTypeKind {
	return violation.subjectType === POLICY_VIOLATION_SUBJECT_TYPE.credentialType
		? 'credential'
		: 'node';
}

const rows = computed(() =>
	violations.map((violation) => ({
		key: `${violation.subjectType ?? ''}:${violation.subject ?? violation.message}`,
		name: nameOf(violation),
		kind: kindOf(violation),
		verdict: getViolationVerdict(violation),
		violation,
	})),
);

/** Unknown subject types go last, under no heading, so a new policy kind still shows. */
const SECTIONS: Array<{ id: string; subjectType?: string; heading?: BaseTextKey }> = [
	{
		id: 'nodes',
		subjectType: POLICY_VIOLATION_SUBJECT_TYPE.nodeType,
		heading: 'typeAvailabilityPolicies.transfer.dialog.nodes',
	},
	{
		id: 'credentials',
		subjectType: POLICY_VIOLATION_SUBJECT_TYPE.credentialType,
		heading: 'typeAvailabilityPolicies.transfer.dialog.credentials',
	},
	{ id: 'other' },
];

const KNOWN_SUBJECT_TYPES = new Set(SECTIONS.flatMap(({ subjectType }) => subjectType ?? []));

const sections = computed(() =>
	SECTIONS.map(({ id, subjectType, heading }) => ({
		id,
		heading,
		rows: rows.value.filter((row) =>
			subjectType
				? row.violation.subjectType === subjectType
				: !KNOWN_SUBJECT_TYPES.has(row.violation.subjectType ?? ''),
		),
	})).filter((section) => section.rows.length > 0),
);

const rowElements = shallowReactive(new Map<string, HTMLElement>());
function setRowElement(key: string, element: unknown) {
	if (element instanceof HTMLElement) rowElements.set(key, element);
	else rowElements.delete(key);
}

const sharedContactCopy = computed(
	() =>
		RESTRICTION_CONTACT_COPY[
			sharedRestrictionContact(
				rows.value.map((row) => resolveRestrictionContact(row.verdict, destinationType.value)),
			)
		],
);

const allKind = computed<RestrictedTypeKind>(() =>
	rows.value.every((row) => row.kind === 'credential') ? 'credential' : 'node',
);

/** Whom the contact dialog writes to, and about what: every row from the footer, one from a row. */
const contact = ref<{ audience: ContactAudience; names: string[]; kind: RestrictedTypeKind }>({
	audience: 'instance',
	names: [],
	kind: 'node',
});

function openContact(target: typeof contact.value) {
	contact.value = target;
	isContactAdminOpen.value = true;
}

function contactForAll() {
	openContact({
		audience: sharedContactCopy.value.audience,
		names: rows.value.map((row) => row.name),
		kind: allKind.value,
	});
}
</script>

<template>
	<PongDialog
		v-model:open="open"
		:header="
			i18n.baseText('typeAvailabilityPolicies.transfer.dialog.title', {
				interpolate: { project: projectName },
			})
		"
		size="medium"
		stacked
		data-test-id="restricted-types-dialog"
	>
		<PongDialogBody :class="$style.body">
			<PongDialogDescription>
				{{
					i18n.baseText('typeAvailabilityPolicies.transfer.dialog.description', {
						interpolate: { project: projectName },
					})
				}}
			</PongDialogDescription>
			<div :class="$style.sections" data-test-id="restricted-types-list">
				<section
					v-for="section in sections"
					:key="section.id"
					data-test-id="restricted-types-section"
				>
					<PongText
						v-if="section.heading"
						tag="p"
						size="small"
						color="text-light"
						bold
						:class="$style.heading"
						data-test-id="restricted-types-section-heading"
					>
						{{ i18n.baseText(section.heading) }}
					</PongText>
					<ul :class="$style.list">
						<li
							v-for="row in section.rows"
							:key="row.key"
							:ref="(element) => setRowElement(row.key, element)"
							:class="$style.row"
						>
							<span :class="$style.icon"><slot name="icon" :violation="row.violation" /></span>
							<PongText size="medium" color="text-dark" :class="$style.name">{{ row.name }}</PongText>
							<RestrictedNodePopover
								:node-type-name="row.name"
								:restriction="row.verdict"
								:kind="row.kind"
								:project-type="destinationType"
								:anchor="rowElements.get(row.key)"
								side="right"
								@contact-admin="
									(audience) => openContact({ audience, names: [row.name], kind: row.kind })
								"
							/>
						</li>
					</ul>
				</section>
			</div>
		</PongDialogBody>
		<PongDialogFooter>
			<PongButton
				variant="outline"
				icon="mail"
				data-test-id="restricted-types-contact-admin"
				@click="contactForAll"
			>
				{{ i18n.baseText(sharedContactCopy.action) }}
			</PongButton>
			<PongButton variant="solid" data-test-id="restricted-types-close" @click="open = false">
				{{ i18n.baseText('generic.close') }}
			</PongButton>
		</PongDialogFooter>
		<ContactAdminModal
			v-model:open="isContactAdminOpen"
			:type-name="contact.names"
			:kind="contact.kind"
			:audience="contact.audience"
			:project="destination"
		/>
	</PongDialog>
</template>

<style lang="scss" module>
.body {
	max-height: 400px;
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.heading {
	text-transform: uppercase;
	letter-spacing: 0.06em;
}

.list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);

	&:last-child {
		border-bottom: none;
	}
}

.icon {
	display: flex;
	flex-shrink: 0;
}

.name {
	flex: 1;
}
</style>
