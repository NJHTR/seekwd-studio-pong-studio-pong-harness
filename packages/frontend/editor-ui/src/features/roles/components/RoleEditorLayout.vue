<script setup lang="ts">
import { PongButton, PongFormInput, PongHeading, PongInput, PongTooltip } from '@pong/design-system';

/**
 * Presentation shared by the project and instance role editors:
 * back button, heading + action buttons (create / save+discard), and the
 * name/description form (editable + read-only variants). The permission/scope
 * body is provided by the default slot so each role type keeps its own editor.
 */

type ValidationRule = { name: string; config?: Record<string, unknown> };

export type RoleEditorLabels = {
	newRoleTitle: string;
	roleName: string;
	description: string;
	optional: string;
	systemRoleNotEditable: string;
	discardChanges: string;
	save: string;
	create: string;
};

defineProps<{
	/** Creating a brand-new role (no slug yet). */
	isNew: boolean;
	isReadOnly: boolean;
	/** Show the Discard + Save buttons (existing, editable, loaded role). */
	showEditButtons: boolean;
	/** Show the Create button (new role). */
	showCreateButton: boolean;
	hasUnsavedChanges: boolean;
	backButtonText: string;
	labels: RoleEditorLabels;
	displayNameValidationRules?: ValidationRule[];
	showDisplayNameError?: boolean;
}>();

const displayName = defineModel<string>('displayName', { required: true });
const description = defineModel<string | null | undefined>('description');

const emit = defineEmits<{
	back: [];
	save: [];
	discard: [];
	create: [];
}>();
</script>

<template>
	<div class="pb-xl" :class="$style.container">
		<PongButton
			variant="ghost"
			icon="arrow-left"
			:class="$style.backButton"
			text
			@click="emit('back')"
		>
			{{ backButtonText }}
		</PongButton>
		<div class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headingContainer">
				<PongHeading tag="h1" size="2xlarge" :class="$style.heading">
					<template v-if="!isNew"
						>Role "<PongTooltip :content="displayName" placement="bottom"
							><span>{{ displayName }}</span></PongTooltip
						>"</template
					>
					<template v-else>{{ labels.newRoleTitle }}</template>
				</PongHeading>
			</div>
			<div v-if="showEditButtons" :class="$style.headerActions">
				<PongButton variant="outline" :disabled="!hasUnsavedChanges" @click="emit('discard')">
					{{ labels.discardChanges }}
				</PongButton>
				<PongButton :disabled="!hasUnsavedChanges" @click="emit('save')">
					{{ labels.save }}
				</PongButton>
			</div>
			<template v-else-if="showCreateButton">
				<PongButton @click="emit('create')">{{ labels.create }}</PongButton>
			</template>
		</div>

		<div class="mb-l" :class="$style.formContainer">
			<!-- Read-only: wrap inputs with a tooltip explaining why they are disabled -->
			<template v-if="isReadOnly">
				<PongFormInput
					v-model="displayName"
					:label="labels.roleName"
					class="mb-s"
					show-required-asterisk
					required
				>
					<PongTooltip :content="labels.systemRoleNotEditable" placement="top">
						<PongInput v-model="displayName" :maxlength="100" disabled />
					</PongTooltip>
				</PongFormInput>
				<PongFormInput v-model="description" :label="labels.description">
					<PongTooltip :content="labels.systemRoleNotEditable" placement="top">
						<PongInput
							v-model="description"
							type="textarea"
							:placeholder="labels.optional"
							:maxlength="500"
							:autosize="{ minRows: 2, maxRows: 4 }"
							disabled
						/>
					</PongTooltip>
				</PongFormInput>
			</template>
			<!-- Editable: standard PongFormInput with full validation -->
			<template v-else>
				<PongFormInput
					v-model="displayName"
					:label="labels.roleName"
					validate-on-blur
					:validation-rules="displayNameValidationRules"
					:show-validation-warnings="showDisplayNameError"
					class="mb-s"
					show-required-asterisk
					required
					:maxlength="100"
				/>
				<PongFormInput
					v-model="description"
					:label="labels.description"
					:placeholder="labels.optional"
					type="textarea"
					:maxlength="500"
					:autosize="{ minRows: 2, maxRows: 4 }"
				/>
			</template>
		</div>

		<slot />
	</div>
</template>

<style lang="css" module>
.container {
	max-width: 700px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
}

.backButton {
	position: absolute;
	top: 10px;
	left: 10px;
}

.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.headingContainer {
	min-width: 0;
}

.heading {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.headerActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.formContainer {
	max-width: 415px;
}
</style>
