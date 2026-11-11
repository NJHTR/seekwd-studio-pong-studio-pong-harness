<script setup lang="ts">
import { PongIcon, PongTooltip } from '@pong/design-system';
</script>

<template>
	<span>
		<PongTooltip content=" " placement="top">
			<template #content>
				<slot />
			</template>
			<PongIcon :class="$style['icon']" icon="triangle-alert" />
		</PongTooltip>
	</span>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.icon {
	font-size: 14px;
	height: 18px;
	color: $warning-tooltip-color;
}
</style>
