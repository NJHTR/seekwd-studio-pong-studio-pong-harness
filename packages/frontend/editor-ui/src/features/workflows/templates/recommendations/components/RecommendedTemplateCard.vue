<script setup lang="ts">
import uniqBy from 'lodash/uniqBy';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { type ITemplatesWorkflowFull } from '@pong/rest-api-client';
import { useRecommendedTemplatesStore } from '../recommendedTemplates.store';
import { useRouter } from 'vue-router';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useI18n } from '@pong/i18n';
import { PongCard, PongIcon, PongTag, PongText } from '@pong/design-system';
import {
	keyFromCredentialTypeAndName,
	normalizeTemplateNodeCredentials,
} from '@/features/workflows/templates/utils/templateTransforms';
import { getNodeTypeDisplayableCredentials } from '@/app/utils/nodes/nodeTransforms';

const props = withDefaults(
	defineProps<{
		template: ITemplatesWorkflowFull;
		tileNumber?: number;
		showDetails?: boolean;
		clickable?: boolean;
	}>(),
	{
		clickable: false,
	},
);

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const { getTemplateRoute, trackTemplateTileClick, trackTemplateShown } =
	useRecommendedTemplatesStore();
const router = useRouter();

const templateNodes = computed(() => {
	if (!props.template?.nodes) return [];

	const uniqueNodeTypes = uniqBy(props.template.nodes, (node) => node.icon).map(
		(node) => node.name,
	);
	const nodeTypesArray = Array.from(uniqueNodeTypes).slice(0, 2);

	return nodeTypesArray.map((nodeType) => nodeTypesStore.getNodeType(nodeType)).filter(Boolean);
});

const credentialsCount = computed(() => {
	const workflowNodes = props.template?.workflow?.nodes ?? [];
	if (workflowNodes.length === 0) return 0;

	const uniqueCredentialKeys = new Set<string>();

	for (const node of workflowNodes) {
		const requiredCredentials = getNodeTypeDisplayableCredentials(nodeTypesStore, node);
		if (requiredCredentials.length === 0) continue;

		const normalizedNodeCredentials = node.credentials
			? normalizeTemplateNodeCredentials(node.credentials)
			: {};

		for (const credentialDescription of requiredCredentials) {
			const credentialType = credentialDescription.name;
			const credentialName = normalizedNodeCredentials[credentialType] ?? '';
			const key = keyFromCredentialTypeAndName(credentialType, credentialName);
			uniqueCredentialKeys.add(key);
		}
	}

	return uniqueCredentialKeys.size;
});

const setupTimeMinutes = computed(() => {
	const BASE_TIME = 2; // minutes for importing/understanding
	const CREDENTIAL_TIME = 3; // minutes per credential

	return BASE_TIME + credentialsCount.value * CREDENTIAL_TIME;
});

const hasTrackedShown = ref(false);
const cardRef = ref<InstanceType<typeof PongCard> | null>(null);
let observer: IntersectionObserver | null = null;

const trackWhenVisible = () => {
	if (hasTrackedShown.value || props.tileNumber === undefined) {
		return;
	}

	hasTrackedShown.value = true;
	trackTemplateShown(props.template.id, props.tileNumber);
	if (observer && cardRef.value) {
		observer.unobserve(cardRef.value.$el);
	}
	observer = null;
};

const handleUseTemplate = async () => {
	if (!props.clickable) return;
	trackTemplateTileClick(props.template.id);
	await router.push(getTemplateRoute(props.template.id));
};

onMounted(() => {
	if (!cardRef.value) return;

	if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
		trackWhenVisible();
		return;
	}

	observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				trackWhenVisible();
				break;
			}
		}
	});

	observer.observe(cardRef.value.$el);
});

onBeforeUnmount(() => {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
});
</script>

<template>
	<PongCard
		ref="cardRef"
		:class="[$style.suggestion, { [$style.clickable]: clickable }]"
		@click="handleUseTemplate"
	>
		<div :class="$style.cardContent">
			<PongText size="large" :bold="true" :class="$style.title">
				{{ template.name }}
			</PongText>
			<div v-if="template.user" :class="$style.userInfo">
				<img
					v-if="template.user.avatar"
					:src="template.user.avatar"
					:alt="template.user.name"
					:class="$style.userAvatar"
				/>
				<PongIcon v-else icon="user" :size="16" />
				<PongText size="medium">
					{{ template.user.name }}
				</PongText>
				<span v-if="template.user.verified" :class="$style.verifiedBadge">
					<PongIcon icon="shield-half" :size="16" />
					<PongText size="medium">
						{{ i18n.baseText('templates.card.verified') }}
					</PongText>
				</span>
			</div>
			<div v-if="showDetails && template.categories?.length" :class="$style.categories">
				<PongTag
					v-for="category in template.categories"
					:key="category.id"
					:text="category.name"
					:clickable="false"
					:class="$style.categoryTag"
				/>
			</div>
			<div :class="$style.statItem">
				<div :class="$style.statItemLeft">
					<div v-if="template.readyToDemo === true" :class="[$style.statItem, $style.mintGreen]">
						<PongIcon icon="zap" :size="16" />
						<PongText size="medium">
							{{ i18n.baseText('templates.card.readyToRun') }}
						</PongText>
					</div>
					<div v-else :class="$style.statItem">
						<PongIcon icon="clock" :size="16" />
						<PongText size="medium">
							{{
								i18n.baseText('templates.card.setupTime', {
									interpolate: { count: setupTimeMinutes },
								})
							}}
						</PongText>
					</div>
				</div>
				<div v-if="templateNodes.length > 0" :class="$style.nodes">
					<NodeIcon
						v-for="nodeType in templateNodes"
						:key="nodeType!.name"
						:size="20"
						:node-type="nodeType"
					/>
				</div>
			</div>
			<div v-if="$slots.belowContent">
				<slot name="belowContent" />
			</div>
		</div>
	</PongCard>
</template>

<style lang="scss" module>
.suggestion {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
	justify-content: space-between;
	min-width: 200px;
	background-color: var(--color--background--light-3);
}

.clickable {
	cursor: pointer;

	&:hover {
		box-shadow: var(--shadow--card-hover);

		.title {
			color: var(--color--primary);
			text-decoration: underline;
		}
	}
}

.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	flex: 1;
}

.nodes {
	display: flex;
	gap: var(--spacing--xs);
}

.statItemLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.userInfo {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-top: auto;
}

.userAvatar {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: 50%;
	object-fit: cover;
}

.verifiedBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--xs);
}

.categories {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.categoryTag {
	--tag--height: var(--spacing--lg);
	--tag--border-color: transparent;
	--tag--padding: var(--spacing--4xs) var(--spacing--2xs);
}

.statItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.mintGreen {
	color: var(--color--mint-700);
}
</style>
