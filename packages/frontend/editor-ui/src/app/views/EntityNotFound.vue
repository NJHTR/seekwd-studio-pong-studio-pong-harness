<script lang="ts" setup>
import { useI18n } from '@pong/i18n';

import { PongButton, PongCard, PongHeading, PongText } from '@pong/design-system';
defineProps<{
	entityType: 'credential' | 'workflow';
}>();

const locale = useI18n();
</script>

<template>
	<div class="entity-not-found-view">
		<PongCard class="entity-card">
			<div class="text-center mb-l">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
				>
					<circle
						cx="12"
						cy="12"
						r="10"
						stroke="var(--text-button--color--text--secondary)"
						stroke-width="2"
					/>
					<rect
						x="11"
						y="6"
						width="2"
						height="8"
						fill="var(--text-button--color--text--secondary)"
					/>
					<rect
						x="11"
						y="16"
						width="2"
						height="2"
						fill="var(--text-button--color--text--secondary)"
					/>
				</svg>
			</div>

			<PongHeading size="xlarge" align="center" tag="h2" color="text-dark" class="mb-2xs">
				{{
					locale.baseText('error.entityNotFound.title', {
						interpolate: { entity: locale.baseText(`generic.${entityType}`) },
					})
				}}
			</PongHeading>
			<PongText color="text-base" tag="p" align="center" class="mb-m">
				{{
					locale.baseText('error.entityNotFound.text', {
						interpolate: { entity: locale.baseText(`generic.${entityType}`).toLocaleLowerCase() },
					})
				}}
			</PongText>
			<PongButton variant="outline" href="/">
				{{ locale.baseText('error.entityNotFound.action') }}
			</PongButton>
		</PongCard>
	</div>
</template>

<style scoped>
.entity-not-found-view {
	display: flex;
	align-items: center;
	justify-content: center;
}

.entity-card {
	max-width: 400px;
	padding: var(--spacing--xl);
}
</style>
