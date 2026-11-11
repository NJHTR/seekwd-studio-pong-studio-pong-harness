<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { EXPERIMENT_TEMPLATE_RECO_V2_KEY } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import type { ITemplatesWorkflowFull } from '@pong/rest-api-client';
import { computed, ref, watchEffect } from 'vue';
import { usePersonalizedTemplatesV2Store } from '../stores/templateRecoV2.store';
import TemplateCard from './TemplateCard.vue';
import YoutubeCard from './YoutubeCard.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@pong/i18n';
import { PongLink, PongSegmentControl, PongSpinner, PongText } from '@pong/design-system';

const props = defineProps<{
	modalName: string;
	data: {
		nodeName?: string;
	};
}>();

const uiStore = useUIStore();
const {
	nodes: userSelectedNodes,
	getNodeData,
	getTemplateData,
	trackModalTabView,
	trackSeeMoreClick,
} = usePersonalizedTemplatesV2Store();
const nodeTypesStore = useNodeTypesStore();
const templatesStore = useTemplatesStore();
const locale = useI18n();

const closeModal = () => {
	uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V2_KEY);
};

const selectedNode = ref<string>(props.data.nodeName ?? userSelectedNodes[0] ?? '');

const starterTemplates = ref<ITemplatesWorkflowFull[]>([]);
const popularTemplates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);

const nodes = computed(() =>
	userSelectedNodes.map((nodeName) => {
		const nodeType = nodeTypesStore.getNodeType(nodeName);
		return {
			value: nodeName,
			label: nodeType?.displayName ?? '',
		};
	}),
);

const nodeTypes = computed(
	() =>
		new Map(userSelectedNodes.map((nodeName) => [nodeName, nodeTypesStore.getNodeType(nodeName)])),
);

const currentNodeData = computed(() => {
	return getNodeData(selectedNode.value);
});

const youtubeVideos = computed(() => {
	return currentNodeData.value.youtube || [];
});

const starterLink = computed(() => {
	const name = nodeTypes.value.get(selectedNode.value)?.displayName ?? '';
	const params = new URLSearchParams(templatesStore.websiteTemplateRepositoryParameters);
	params.set('integrations', name);
	params.set('q', 'Simple');
	return templatesStore.constructTemplateRepositoryURL(params);
});

const popularLink = computed(() => {
	const name = nodeTypes.value.get(selectedNode.value)?.displayName ?? '';
	const params = new URLSearchParams(templatesStore.websiteTemplateRepositoryParameters);
	params.set('integrations', name);
	return templatesStore.constructTemplateRepositoryURL(params);
});

function onSelectedNodeChange(val: string) {
	selectedNode.value = val;
}

watchEffect(async () => {
	if (!selectedNode.value) return;

	const nodeDisplayName = nodes.value.find((n) => n.value === selectedNode.value)?.label;
	if (nodeDisplayName) {
		trackModalTabView(nodeDisplayName);
	}

	isLoadingTemplates.value = true;
	try {
		const nodeData = getNodeData(selectedNode.value);
		const starterPromises = nodeData.starter?.map(async (id) => await getTemplateData(id)) || [];
		const popularPromises = nodeData.popular?.map(async (id) => await getTemplateData(id)) || [];

		const [starterResults, popularResults] = await Promise.all([
			Promise.allSettled(starterPromises),
			Promise.allSettled(popularPromises),
		]);

		starterTemplates.value = starterResults
			.filter(
				(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull> =>
					result.status === 'fulfilled' && result.value !== null,
			)
			.map((result) => result.value);

		popularTemplates.value = popularResults
			.filter(
				(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull> =>
					result.status === 'fulfilled' && result.value !== null,
			)
			.map((result) => result.value);
	} catch (error) {
		console.error('Error loading templates:', error);
	} finally {
		isLoadingTemplates.value = false;
	}
});
</script>

<template>
	<Modal
		:name="EXPERIMENT_TEMPLATE_RECO_V2_KEY"
		min-width="min(800px, 90vw)"
		max-height="90vh"
		@close="closeModal"
		@canceled="closeModal"
	>
		<template #header>
			<div :class="$style.header">
				<PongSegmentControl
					v-model="selectedNode"
					:options="nodes"
					@update:model-value="onSelectedNodeChange"
				>
					<template #option="option">
						<div :class="$style.tab">
							<NodeIcon
								:size="18"
								:class="$style.nodeIcon"
								:stroke-width="1.5"
								:node-type="nodeTypes.get(option.value)"
							/>
						</div>
					</template>
				</PongSegmentControl>
			</div>
		</template>
		<template #content>
			<div :class="[$style.title, 'mb-m']">
				<PongText tag="h2" size="large" :bold="true">{{
					locale.baseText('workflows.templateRecoV2.starterTemplates')
				}}</PongText>
				<PongLink :href="starterLink" @click="trackSeeMoreClick('starter')">
					{{ locale.baseText('workflows.templateRecoV2.seeMoreStarterTemplates') }}
				</PongLink>
			</div>
			<div :class="$style.suggestions">
				<div v-if="isLoadingTemplates" :class="$style.loading">
					<PongSpinner size="small" />
					<PongText size="small">{{
						locale.baseText('workflows.templateRecoV2.loadingTemplates')
					}}</PongText>
				</div>
				<TemplateCard
					v-for="template in starterTemplates"
					v-else
					:key="template.id"
					:template="template"
					:current-node-name="selectedNode"
				/>
			</div>
			<div :class="[$style.title, 'mb-m mt-m']">
				<PongText tag="h2" size="large" :bold="true">{{
					locale.baseText('workflows.templateRecoV2.popularTemplates')
				}}</PongText>
				<PongLink :href="popularLink" @click="trackSeeMoreClick('popular')">
					{{ locale.baseText('workflows.templateRecoV2.seeMorePopularTemplates') }}</PongLink
				>
			</div>
			<div :class="$style.suggestions">
				<div v-if="isLoadingTemplates" :class="$style.loading">
					<PongSpinner size="small" />
					<PongText size="small">{{
						locale.baseText('workflows.templateRecoV2.loadingTemplates')
					}}</PongText>
				</div>
				<TemplateCard
					v-for="template in popularTemplates"
					v-else
					:key="template.id"
					:template="template"
					:current-node-name="selectedNode"
				/>
			</div>
			<PongText tag="h2" size="large" :bold="true" class="mb-m mt-m">{{
				locale.baseText('workflows.templateRecoV2.tutorials')
			}}</PongText>
			<div :class="$style.videos">
				<YoutubeCard
					v-for="video in youtubeVideos"
					:key="video.id"
					:video-id="video.id"
					:title="video.title"
					:description="video.description"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	border-bottom: 1px solid var(--border-color);
	padding-bottom: var(--spacing--sm);
}

.tab {
	padding: var(--spacing--3xs);
}

.suggestions {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--md);
	overflow-x: auto;
	min-height: 182px;
}

.title {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.videos {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	overflow-x: auto;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
	color: var(--color--text--tint-1);
}
</style>
