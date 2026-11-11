<script lang="ts" setup>
import type { ProjectMemberData } from '../projects.types';
import type { UserAction } from '@pong/design-system';

import { PongActionToggle } from '@pong/design-system';
const props = defineProps<{
	data: ProjectMemberData;
	actions: Array<UserAction<ProjectMemberData>>;
}>();

const emit = defineEmits<{
	action: [value: { action: string; userId: string }];
}>();

const onAction = (action: string) => {
	emit('action', { action, userId: props.data.id });
};
</script>

<template>
	<PongActionToggle
		v-if="props.actions.length > 0"
		placement="bottom"
		:actions="props.actions"
		theme="dark"
		@action="onAction"
	/>
</template>
