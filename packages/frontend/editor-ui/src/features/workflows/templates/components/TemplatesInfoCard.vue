<script lang="ts" setup>
import Card from '@/app/components/CollectionWorkflowCard.vue';
import NodeList from '@/app/components/NodeList.vue';
import { useI18n } from '@pong/i18n';
import type { ITemplatesCollection } from '@pong/rest-api-client/api/templates';

import { PongText } from '@pong/design-system';
withDefaults(
	defineProps<{
		collection: ITemplatesCollection;
		loading?: boolean;
		showItemCount?: boolean;
		width: string;
	}>(),
	{
		loading: false,
		showItemCount: true,
	},
);

const i18n = useI18n();
</script>

<template>
	<Card :loading="loading" :title="collection.name" :style="{ width }">
		<template #footer>
			<span>
				<PongText v-show="showItemCount" size="small" color="text-light">
					{{ collection.workflows.length }}
					{{ i18n.baseText('templates.workflows') }}
				</PongText>
			</span>
			<NodeList :nodes="collection.nodes" :show-more="false" />
		</template>
	</Card>
</template>
