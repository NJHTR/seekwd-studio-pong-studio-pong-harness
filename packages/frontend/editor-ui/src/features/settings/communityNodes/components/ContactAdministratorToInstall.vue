<script setup lang="ts">
import { useUsersStore } from '@pong/stores/users.store';
import { PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, onMounted, useCssModule } from 'vue';

interface Props {
	box?: boolean;
}

const props = defineProps<Props>();

const $style = useCssModule();
const usersStore = useUsersStore();

const i18n = useI18n();
const ownerEmailList = computed(() =>
	usersStore.allUsers.filter((user) => user.role?.includes('owner')).map((user) => user.email),
);

const classes = computed(() => ({
	[$style.contactOwnerHint]: true,
	[$style.border]: props.box,
}));

onMounted(async () => {
	// just to ensure styles are applied
	await usersStore.fetchUsers({ filter: { isOwner: true } });
});
</script>

<template>
	<div :class="classes">
		<PongIcon v-if="props.box" color="text-light" icon="info" size="large" />
		<PongText color="text-base" size="medium">
			<div style="padding-bottom: 8px">
				{{ i18n.baseText('communityNodeInfo.contact.admin') }}
			</div>
			<PongText v-if="ownerEmailList.length" bold>
				{{ ownerEmailList.join(', ') }}
			</PongText>
		</PongText>
	</div>
</template>

<style lang="scss" module>
.contactOwnerHint {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
	border-radius: 0.25em;
}

.border {
	border: var(--border-width) solid var(--color--foreground);
}
</style>
