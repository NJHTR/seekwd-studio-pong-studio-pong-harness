<script lang="ts" setup="">
import type { UsersList } from '@pong/api-types';
import type { UserAction } from '@pong/design-system';
import type { IUser } from '@pong/rest-api-client/api/users';

import { PongActionToggle } from '@pong/design-system';
const props = defineProps<{
	data: UsersList['items'][number];
	actions: Array<UserAction<IUser>>;
}>();

const emit = defineEmits<{
	action: [value: { action: string; userId: string }];
}>();

const onUserAction = (action: string) => {
	emit('action', {
		action,
		userId: props.data.id,
	});
};
</script>

<template>
	<div>
		<PongActionToggle
			v-if="props.data.signInType !== 'ldap' && props.actions.length > 0"
			placement="bottom"
			:actions="props.actions"
			theme="dark"
			@action="onUserAction"
		/>
	</div>
</template>
