<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import PongCanvasPill from '../CanvasPill';
import PongAvatar from '../PongAvatar';
import PongButton from '../PongButton';

defineOptions({
	name: 'PongCanvasCollaborationPill',
});

const props = defineProps<{
	firstName: string;
	lastName?: string;
	isAnotherTab?: boolean;
}>();

const emit = defineEmits<{
	buttonClick: [];
}>();

const { t } = useI18n();

const userName = computed(() => {
	return props.lastName ? `${props.firstName} ${props.lastName}` : props.firstName;
});

const message = computed(() => {
	return props.isAnotherTab
		? t('collaboration.canvas.editingAnotherTab')
		: t('collaboration.canvas.editing', { user: userName.value });
});

const handleButtonClick = () => {
	emit('buttonClick');
};
</script>

<template>
	<PongCanvasPill>
		<template #icon>
			<PongAvatar v-if="!isAnotherTab" :first-name="firstName" :last-name="lastName" size="small" />
		</template>
		<span :class="$style.content">
			{{ message }}
			<PongButton v-if="isAnotherTab" variant="outline" size="xsmall" @click="handleButtonClick">
				{{ t('collaboration.canvas.acquireEditing') }}
			</PongButton>
		</span>
	</PongCanvasPill>
</template>

<style lang="scss" module>
.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
