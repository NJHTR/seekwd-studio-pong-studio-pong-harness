<script setup lang="ts">
import { PongEmptyStateIconCards } from '@pong/design-system';

import { MCP_CLIENT_LOGO_CYCLE } from '../mcp.clients.catalog';
</script>

<template>
	<PongEmptyStateIconCards
		:class="$style.cards"
		center-icon="mcp"
		:side-icons="MCP_CLIENT_LOGO_CYCLE"
	/>
</template>

<style lang="scss" module>
.cards {
	/* Fixed white tiles so the dark brand marks stay visible on the dark theme, as in the client rows. */
	--empty-state-icon-cards--tile-background: var(--color--neutral-white);
	--empty-state-icon-cards--tile-color: var(--color--neutral-black);
}
</style>
