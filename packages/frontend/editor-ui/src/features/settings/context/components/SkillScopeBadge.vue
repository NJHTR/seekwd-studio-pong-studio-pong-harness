<script setup lang="ts">
import { computed } from 'vue';
import type { SkillListItem } from '@pong/api-types';
import { PongBadge, PongIcon } from '@pong/design-system';

import { useSkillScopeDisplay } from '../skills.utils';

const props = defineProps<{
	skill: Pick<SkillListItem, 'scope' | 'projectId' | 'projectName' | 'projectType'>;
}>();

const { scopeDisplay } = useSkillScopeDisplay();

const display = computed(() => scopeDisplay(props.skill));
</script>

<template>
	<PongBadge variant="outline" :class="$style.badge" data-test-id="skill-scope-badge">
		<!-- The leading slot is a direct flex child of the badge, so the icon centres with the label. -->
		<template #leading>
			<PongIcon :class="$style.icon" :icon="display.icon" size="small" />
		</template>
		{{ display.label }}
	</PongBadge>
</template>

<style lang="scss" module>
.badge {
	max-width: 100%;

	// Geist sits high in its line box, so the inherited line height leaves the label above the
	// icon. Padding keeps descenders clear of the label's ellipsis clip.
	> :global(.pong-text) {
		line-height: 1;
		padding-block: var(--spacing--5xs);
	}
}

.icon {
	flex-shrink: 0;
}
</style>
