<script setup lang="ts">
import { ref } from 'vue';
import { MAX_TAG_NAME_LENGTH } from '../../../tags.constants';
import { useI18n } from '@pong/i18n';

import { ElCol, ElRow } from 'element-plus';
import { PongButton, PongIcon, PongInput } from '@pong/design-system';
withDefaults(
	defineProps<{
		disabled: boolean;
		search: string;
		canCreate?: boolean;
	}>(),
	{
		disabled: false,
		search: '',
		canCreate: true,
	},
);

const i18n = useI18n();

const emit = defineEmits<{
	searchChange: [value: string];
	createEnable: [];
}>();

const maxLength = ref(MAX_TAG_NAME_LENGTH);

const onAddNew = () => {
	emit('createEnable');
};

const onSearchChange = (search: string) => {
	emit('searchChange', search);
};
</script>

<template>
	<ElRow class="tags-header">
		<ElCol :span="10">
			<PongInput
				:placeholder="i18n.baseText('tagsTableHeader.searchTags')"
				:model-value="search"
				:disabled="disabled"
				:maxlength="maxLength"
				clearable
				@update:model-value="onSearchChange"
			>
				<template #prefix>
					<PongIcon icon="search" />
				</template>
			</PongInput>
		</ElCol>
		<ElCol :span="14">
			<PongButton
				v-if="canCreate"
				:disabled="disabled"
				icon="plus"
				:label="i18n.baseText('tagsTableHeader.addNew')"
				size="large"
				float="right"
				@click="onAddNew"
			/>
		</ElCol>
	</ElRow>
</template>

<style lang="scss" scoped>
.tags-header {
	margin-bottom: 15px;
}
</style>
