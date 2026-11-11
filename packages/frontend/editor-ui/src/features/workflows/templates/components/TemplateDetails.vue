<script setup lang="ts">
import TemplateDetailsBlock from './TemplateDetailsBlock.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { filterTemplateNodes } from '@/app/utils/nodeTypesUtils';
import { abbreviateNumber } from '@/app/utils/typesUtils';
import type {
	ITemplatesCollection,
	ITemplatesCollectionFull,
	ITemplatesNode,
	ITemplatesWorkflow,
} from '@pong/rest-api-client/api/templates';
import type { ITag } from '@pong/rest-api-client/api/tags';
import { useTemplatesStore } from '../templates.store';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { isFullTemplatesCollection, isTemplatesWorkflow } from '../utils/typeGuards';
import { useRouter } from 'vue-router';
import { useI18n } from '@pong/i18n';
import { computed } from 'vue';

import { PongLoading, PongTags, PongText } from '@pong/design-system';
const props = defineProps<{
	template: ITemplatesWorkflow | ITemplatesCollection | ITemplatesCollectionFull | null;
	blockTitle: string;
	loading: boolean;
}>();

const router = useRouter();
const i18n = useI18n();

const templatesStore = useTemplatesStore();

const categoriesAsTags = computed<ITag[]>(() =>
	props.template && 'categories' in props.template
		? props.template.categories.map((category) => ({
				id: `${category.id}`,
				name: category.name,
			}))
		: [],
);

const redirectToCategory = (id: string) => {
	templatesStore.resetSessionId();
	void router.push(`/templates?categories=${id}`);
};

const redirectToSearchPage = (node: ITemplatesNode) => {
	templatesStore.resetSessionId();
	void router.push(`/templates?search=${node.displayName}`);
};
</script>

<template>
	<div>
		<PongLoading :loading="loading" :rows="5" variant="p" />

		<TemplateDetailsBlock
			v-if="!loading && template && template.nodes.length > 0"
			:title="blockTitle"
		>
			<div :class="$style.icons">
				<div
					v-for="node in filterTemplateNodes(template.nodes)"
					:key="node.name"
					:class="$style.icon"
				>
					<NodeIcon
						:node-type="node"
						:size="24"
						:show-tooltip="true"
						@click="redirectToSearchPage(node)"
					/>
				</div>
			</div>
		</TemplateDetailsBlock>

		<TemplateDetailsBlock
			v-if="!loading && isFullTemplatesCollection(template) && categoriesAsTags.length > 0"
			:title="i18n.baseText('template.details.categories')"
		>
			<PongTags :tags="categoriesAsTags" @click:tag="redirectToCategory" />
		</TemplateDetailsBlock>

		<TemplateDetailsBlock
			v-if="!loading && template"
			:title="i18n.baseText('template.details.details')"
		>
			<div :class="$style.text">
				<PongText v-if="isTemplatesWorkflow(template)" size="small" color="text-base">
					{{ i18n.baseText('template.details.created') }}
					<TimeAgo :date="template.createdAt" />
					{{ i18n.baseText('template.details.by') }}
					{{ template.user ? template.user.username : 'pong team' }}
				</PongText>
			</div>
			<div :class="$style.text">
				<PongText
					v-if="isTemplatesWorkflow(template) && template.totalViews !== 0"
					size="small"
					color="text-base"
				>
					{{ i18n.baseText('template.details.viewed') }}
					{{ abbreviateNumber(template.totalViews) }}
					{{ i18n.baseText('template.details.times') }}
				</PongText>
			</div>
		</TemplateDetailsBlock>
	</div>
</template>

<style lang="scss" module>
.icons {
	display: flex;
	flex-wrap: wrap;
}
.icon {
	margin-right: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
	cursor: pointer;
}
.text {
	padding-bottom: var(--spacing--xs);
}
</style>
