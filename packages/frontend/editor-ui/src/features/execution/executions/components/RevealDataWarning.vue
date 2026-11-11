<script setup lang="ts">
import { PongLink } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { EXECUTION_DATA_REDACTION_DOCS_URL } from '@/app/constants';

defineProps<{
	warning: string;
	logged: string;
	legitimate: string;
	policy: string;
}>();

const i18n = useI18n();
</script>

<template>
	<div>
		<p>{{ warning }}</p>
		<ul :class="$style.list">
			<li>{{ logged }}</li>
			<li>{{ legitimate }}</li>
			<li>{{ policy }}</li>
		</ul>
		<PongLink
			:to="EXECUTION_DATA_REDACTION_DOCS_URL"
			size="small"
			new-window
			data-test-id="reveal-data-warning-docs-link"
		>
			{{ i18n.baseText('generic.learnMore') }}
		</PongLink>
	</div>
</template>

<style module lang="scss">
.list {
	text-align: left;
	margin-top: var(--spacing--2xs);
	padding-left: var(--spacing--xl);

	li + li {
		margin-top: var(--spacing--4xs);
	}
}
</style>

<style lang="scss">
.reveal-redacted-data-modal {
	width: 500px;

	.el-message-box__content {
		padding: var(--spacing--sm) var(--spacing--lg);
	}
}
</style>
