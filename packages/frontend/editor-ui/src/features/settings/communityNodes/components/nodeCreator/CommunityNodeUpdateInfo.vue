<script setup lang="ts">
import { useUIStore } from '@/app/stores/ui.store';
import { i18n } from '@pong/i18n';

import { PongButton, PongCallout } from '@pong/design-system';
interface Props {
	packageName?: string;
	source?: string;
}

const props = defineProps<Props>();

const { openCommunityPackageUpdateConfirmModal } = useUIStore();

const onUpdate = () => {
	if (!props.packageName) return;
	openCommunityPackageUpdateConfirmModal(props.packageName, props.source);
};
</script>

<template>
	<PongCallout theme="secondary" :iconless="true" style="margin-bottom: var(--spacing--sm)">
		{{ i18n.baseText('communityNodeUpdateInfo.available') }}
		<template v-if="props.packageName" #trailingContent>
			<PongButton variant="outline" @click="onUpdate">
				{{ i18n.baseText('generic.update') }}
			</PongButton>
		</template>
	</PongCallout>
</template>
