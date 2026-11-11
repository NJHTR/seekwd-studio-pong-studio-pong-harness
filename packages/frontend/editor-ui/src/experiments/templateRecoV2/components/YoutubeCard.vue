<script setup lang="ts">
import { usePersonalizedTemplatesV2Store } from '../stores/templateRecoV2.store';
import { PongCard, PongText } from '@pong/design-system';

const props = defineProps<{
	videoId: string;
	title: string;
	description: string;
}>();

const { trackVideoClick } = usePersonalizedTemplatesV2Store();

const openYouTubeVideo = () => {
	trackVideoClick(props.title);
	window.open(`https://www.youtube.com/watch?v=${props.videoId}`, '_blank');
};
</script>

<template>
	<PongCard hoverable @click="openYouTubeVideo">
		<div :class="$style.tutorial">
			<img
				:src="`https://img.youtube.com/vi/${props.videoId}/hq720.jpg`"
				width="250px"
				:class="$style.video"
			/>
			<div>
				<PongText tag="h2" size="large" :bold="true">{{ props.title }}</PongText>
				<PongText tag="h3" size="small" class="mt-2xs">{{ props.description }}</PongText>
			</div>
		</div>
	</PongCard>
</template>

<style lang="scss" module>
.tutorial {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--sm);
}

.video {
	border-radius: var(--radius);
}
</style>
