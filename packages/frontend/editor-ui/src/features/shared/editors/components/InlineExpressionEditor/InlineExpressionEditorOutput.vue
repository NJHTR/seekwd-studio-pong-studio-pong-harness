<script setup lang="ts">
import type { EditorState, SelectionRange } from '@codemirror/state';

import { useI18n } from '@pong/i18n';
import { injectNDVStore } from '@/features/ndv/shared/ndv.store';
import type { Segment } from '@/app/types/expressions';
import { isPairedItemNotOnBranchError } from '@/app/utils/expressions';
import { computed, onBeforeUnmount, useTemplateRef } from 'vue';
import ExpressionOutput from './ExpressionOutput.vue';
import OutputItemSelect from './OutputItemSelect.vue';
import InlineExpressionTip from './InlineExpressionTip.vue';
import { outputTheme } from './theme';
import { useStyles } from '@pong/composables/useStyles';

import { PongPopover, PongText } from '@pong/design-system';
interface InlineExpressionEditorOutputProps {
	segments: Segment[];
	unresolvedExpression?: string;
	editorState?: EditorState;
	selection?: SelectionRange;
	isReadOnly?: boolean;
	visible: boolean;
	virtualRef?: HTMLElement;
}

const props = withDefaults(defineProps<InlineExpressionEditorOutputProps>(), {
	editorState: undefined,
	selection: undefined,
	isReadOnly: false,
	unresolvedExpression: undefined,
});

const i18n = useI18n();
const theme = outputTheme();
const ndvStore = injectNDVStore();
const contentRef = useTemplateRef('content');
const { APP_Z_INDEXES } = useStyles();

const hasPairedItemNotOnBranchError = computed(() =>
	props.segments.some(
		(segment) => segment.kind === 'resolvable' && isPairedItemNotOnBranchError(segment.error),
	),
);

onBeforeUnmount(() => {
	ndvStore.value.expressionOutputItemIndex = 0;
});

defineExpose({
	contentRef,
});
</script>

<template>
	<PongPopover
		:open="visible"
		side="bottom"
		:side-flip="false"
		:side-offset="0"
		align="start"
		:reference="virtualRef"
		width="var(--reka-popper-anchor-width)"
		:content-class="$style.popover"
		:enable-slide-in="false"
		:enable-scrolling="false"
		:suppress-auto-focus="true"
		:z-index="APP_Z_INDEXES.NDV + 1"
	>
		<template #content>
			<div ref="content" :class="[$style.dropdown, 'ignore-key-press-canvas']">
				<div :class="$style.header">
					<PongText bold size="small" compact>
						{{ i18n.baseText('parameterInput.result') }}
					</PongText>

					<OutputItemSelect />
				</div>
				<PongText :class="$style.body">
					<ExpressionOutput
						data-test-id="inline-expression-editor-output"
						:segments="segments"
						:extensions="theme"
					>
					</ExpressionOutput>
				</PongText>
				<div v-if="!isReadOnly" :class="$style.footer">
					<InlineExpressionTip
						:editor-state="editorState"
						:selection="selection"
						:unresolved-expression="unresolvedExpression"
						:paired-item-not-on-branch="hasPairedItemNotOnBranchError"
					/>
				</div>
			</div>
		</template>
	</PongPopover>
</template>

<style lang="scss" module>
.popover {
	border-top: none;
	border-top-left-radius: 0;
	border-top-right-radius: 0;
}

.dropdown {
	display: flex;
	flex-direction: column;
	background: var(--code--color--background);
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	:global(.cm-editor) {
		background-color: var(--code--color--background);
	}

	.body {
		padding: var(--spacing--3xs);
		padding-top: 0;
		padding-left: var(--spacing--2xs);
		color: var(--color--text--shade-1);

		&:first-child {
			padding-top: var(--spacing--2xs);
		}
	}

	.footer {
		border-top: var(--border);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing--2xs);
		color: var(--color--text--shade-1);
		font-weight: var(--font-weight--medium);
		padding: 0 var(--spacing--2xs);
		padding-top: var(--spacing--2xs);
	}
}
</style>
