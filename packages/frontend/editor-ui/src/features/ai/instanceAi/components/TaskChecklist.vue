<script lang="ts" setup>
import type { TaskList } from '@pong/api-types';
import { PongCard, PongIcon, PongText, type IconName, type TextColor } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';
import ButtonLike from './ButtonLike.vue';

const props = defineProps<{
	tasks?: TaskList;
}>();

const i18n = useI18n();

type StatusConfig = {
	icon: IconName;
	spin?: boolean;
	color: TextColor;
	textColor?: TextColor;
	lineThrough?: boolean;
};

const statusConfig: Record<string, StatusConfig> = {
	todo: { icon: 'circle', color: 'text-xlight' },
	in_progress: {
		icon: 'spinner',
		spin: true,
		color: 'primary',
	},
	done: { icon: 'check', color: 'success', textColor: 'text-light' },
	failed: { icon: 'triangle-alert', color: 'danger' },
	cancelled: {
		icon: 'x',
		color: 'text-xlight',
		lineThrough: true,
	},
};

function getConfig(status: string) {
	return statusConfig[status] ?? statusConfig.todo;
}

const taskList = computed(() =>
	(props.tasks?.tasks ?? []).map((task) => {
		const config = getConfig(task.status);

		return {
			...task,
			...config,
			// Threads saved before descriptions were required can hold a blank one,
			// which would render a row with an icon and no label.
			description: task.description.trim() || i18n.baseText('instanceAi.tasks.untitled'),
		};
	}),
);
</script>

<template>
	<PongCard v-if="taskList.length">
		<ButtonLike v-for="task in taskList" :key="task.id">
			<PongIcon :icon="task.icon" :spin="task.spin" size="small" :color="task.color" />
			<span :class="$style.content">
				<PongText :color="task.textColor" :class="{ [$style.lineThrough]: task.lineThrough }">
					{{ task.description }}
				</PongText>
				<PongText v-if="task.detail" size="small" color="text-light" :class="$style.detail">
					{{ task.detail }}
				</PongText>
			</span>
		</ButtonLike>
	</PongCard>
</template>

<style lang="scss" module>
.content {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.detail {
	line-height: var(--font-line-height-regular);
}

.lineThrough {
	text-decoration: line-through;
}
</style>
