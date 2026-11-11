<script lang="ts" setup>
import { useI18n } from '@pong/i18n';
const i18 = useI18n();
</script>

<template>
	<div>
		<a data-action="reload">{{ i18.baseText('nodeView.refresh') }}</a>
		{{ i18.baseText('nodeView.toSeeTheLatestStatus') }}.
		<br />
		<a
			href="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
			target="_blank"
		>
			{{ i18.baseText('nodeView.moreInfo') }}
		</a>
	</div>
</template>
