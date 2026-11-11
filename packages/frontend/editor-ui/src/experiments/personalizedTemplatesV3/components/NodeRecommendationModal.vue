<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { EXPERIMENT_TEMPLATE_RECO_V3_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { ITemplatesWorkflowFull } from '@pong/rest-api-client';
import { ref, watchEffect } from 'vue';
import { usePersonalizedTemplatesV3Store } from '../stores/personalizedTemplatesV3.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import TemplateCard from './TemplateCard.vue';
import { useI18n } from '@pong/i18n';
import { PongCard, PongIcon, PongSpinner, PongText } from '@pong/design-system';

const uiStore = useUIStore();
const templatesStore = useTemplatesStore();
const {
	getHubSpotData,
	getTemplateData,
	trackPersonalizationModalView,
	trackTemplatesRepoClickFromModal,
} = usePersonalizedTemplatesV3Store();
const locale = useI18n();

const closeModal = () => {
	uiStore.closeModal(EXPERIMENT_TEMPLATE_RECO_V3_KEY);
};

const openTemplateRepository = () => {
	trackTemplatesRepoClickFromModal();
	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
};

const templates = ref<ITemplatesWorkflowFull[]>([]);
const isLoadingTemplates = ref(false);

watchEffect(async () => {
	trackPersonalizationModalView();

	isLoadingTemplates.value = true;
	try {
		const hubspotData = getHubSpotData();
		const templatePromises =
			hubspotData.templates?.map(async (id) => await getTemplateData(id)) || [];

		const results = await Promise.allSettled(templatePromises);

		templates.value = results
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
		:name="EXPERIMENT_TEMPLATE_RECO_V3_KEY"
		min-width="min(800px, 90vw)"
		max-height="90vh"
		:class="$style.modal"
		@close="closeModal"
		@canceled="closeModal"
	>
		<template #header>
			<div :class="$style.header">
				<PongText tag="h1" size="large" :bold="true">
					{{ locale.baseText('experiments.personalizedTemplatesV3.recommendedForYou') }}
				</PongText>
			</div>
		</template>
		<template #content>
			<div v-if="isLoadingTemplates" :class="$style.loading">
				<PongSpinner size="small" />
				<PongText size="small">{{
					locale.baseText('experiments.personalizedTemplatesV3.loadingTemplates')
				}}</PongText>
			</div>
			<div v-else>
				<div :class="$style.templates">
					<TemplateCard v-for="template in templates" :key="template.id" :template="template" />
				</div>
				<PongCard :class="[$style.footerCard]" @click="openTemplateRepository">
					<div :class="$style.footerContent">
						<div :class="$style.footerText">
							<PongText size="medium" :bold="true" class="mr-s" color="text-light">
								{{ locale.baseText('experiments.personalizedTemplatesV3.couldntFind') }}
							</PongText>
							<PongText size="small" :class="'mt-2xs'">
								{{ locale.baseText('experiments.personalizedTemplatesV3.browseAllTemplates') }}
							</PongText>
						</div>
						<div :class="$style.footerIcon">
							<PongIcon icon="external-link" size="medium" />
						</div>
					</div>
				</PongCard>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.modal {
	background-color: var(--color--background--light-3);
}

.header {
	border-bottom: 1px solid var(--border-color);
	padding-bottom: var(--spacing--sm);
}

.templates {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
	color: var(--color--text--tint-1);
}

.footerCard {
	border: 1px solid var(--color--foreground);
	background-color: var(--color--background--light-2);
	cursor: pointer;
	transition: all 0.2s ease;

	&:hover {
		border-color: var(--color--primary);
		color: var(--color--primary);
	}
}

.footerContent {
	display: flex;
	justify-content: space-between;
	align-items: start;
	width: 100%;

	.footerText {
		display: flex;
		flex-direction: column;
	}
}

.footerIcon {
	color: var(--color--text--tint-1);
}
</style>
