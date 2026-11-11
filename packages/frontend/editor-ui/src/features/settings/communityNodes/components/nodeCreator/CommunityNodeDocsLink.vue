<script setup lang="ts">
import { i18n } from '@pong/i18n';

import { PongIcon, PongLink, PongText } from '@pong/design-system';
export interface Props {
	packageName: string;
}

const props = defineProps<Props>();

const openCommunityNodeDocsPage = () => {
	const newTab = window.open(`https://www.npmjs.com/package/${props.packageName}`, '_blank');
	if (newTab) newTab.opener = null;
};
</script>

<template>
	<PongLink
		theme="text"
		:class="$style.container"
		:title="i18n.baseText('communityNodesDocsLink.link.title')"
		@click="openCommunityNodeDocsPage"
	>
		<PongText size="small" bold style="margin-right: 5px">
			{{ i18n.baseText('communityNodesDocsLink.title') }}
		</PongText>
		<PongIcon icon="external-link" />
	</PongLink>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	margin-left: auto;
	padding-bottom: var(--spacing--5xs);
}
</style>
