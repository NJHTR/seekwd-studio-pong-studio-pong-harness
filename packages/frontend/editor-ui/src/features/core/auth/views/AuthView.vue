<script setup lang="ts">
import { computed, useCssModule } from 'vue';

import { PongFormBox, PongLogo } from '@pong/design-system';
import type { FormFieldValueUpdate, IFormBoxConfig } from '@/Interface';
import type { EmailOrLdapLoginIdAndPassword } from './SigninView.vue';

const props = withDefaults(
	defineProps<{
		/** The standard form box. Omit it when the default slot renders the card instead. */
		form?: IFormBoxConfig;
		formLoading?: boolean;
		subtitle?: string;
		/** Large heading shown in the left column. Falls back to `subtitle`, then to the default. */
		title?: string;
		/** Supporting sentence under the heading. */
		description?: string;
	}>(),
	{
		form: undefined,
		formLoading: false,
		subtitle: undefined,
		title: undefined,
		description: undefined,
	},
);

const emit = defineEmits<{
	update: [FormFieldValueUpdate];
	submit: [values: EmailOrLdapLoginIdAndPassword];
	secondaryClick: [];
}>();

const onUpdate = (e: FormFieldValueUpdate) => {
	emit('update', e);
};

const onSubmit = (data: unknown) => {
	emit('submit', data as EmailOrLdapLoginIdAndPassword);
};

const onSecondaryClick = () => {
	emit('secondaryClick');
};

const heading = computed(() => props.title ?? props.subtitle ?? '欢迎使用 Pong Studio');
const supportingText = computed(
	() => props.description ?? '进入工作台，用自然语言和节点画布编排智能体工作流。',
);

const $style = useCssModule();
</script>

<template>
	<main :class="$style.page">
		<div :class="$style.wrap">
			<section :class="$style.card" aria-labelledby="auth-heading">
				<div :class="$style.copy">
					<PongLogo :class="$style.brand" size="large" />
					<h1 id="auth-heading" :class="$style.title">{{ heading }}</h1>
					<p :class="$style.description">{{ supportingText }}</p>
				</div>

				<div :class="$style.formColumn">
					<slot>
						<PongFormBox
							v-if="form"
							v-bind="form"
							data-test-id="auth-form"
							:button-loading="formLoading"
							submit-button-variant="brand"
							@secondary-click="onSecondaryClick"
							@submit="onSubmit"
							@update="onUpdate"
						/>
					</slot>
					<div v-if="$slots.guest" :class="$style.guestSlot">
						<span :class="$style.guestDivider">或者</span>
						<slot name="guest" />
					</div>
				</div>
			</section>

			<footer :class="$style.footer">
				<span :class="$style.footerLanguage">简体中文</span>
				<nav :class="$style.footerNav" aria-label="帮助与政策">
					<a href="#help">帮助</a>
					<a href="#privacy">隐私权</a>
					<a href="#terms">条款</a>
				</nav>
			</footer>
		</div>
	</main>
</template>

<style lang="scss" module>
.page {
	position: fixed;
	inset: 0;
	z-index: 10;
	display: grid;
	min-height: 100vh;
	overflow-y: auto;
	place-items: center;
	padding: 40px 24px 30px;
	background: #f0f4f9;
	color: #1f1f1f;
	font-family: var(--font-family);
	-webkit-font-smoothing: antialiased;
}

.wrap {
	width: min(100%, 1040px);
	margin: auto;
}

.card {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
	align-items: center;
	gap: 48px;
	min-height: 384px;
	padding: 36px;
	border: 1px solid rgba(255, 255, 255, 0.85);
	border-radius: 6px;
	background: #fff;
	box-shadow: 0 1px 2px rgba(60, 64, 67, 0.03);
}

.copy {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	align-self: stretch;
	padding-top: 2px;
}

.brand {
	align-self: flex-start;
	margin-bottom: 4px !important;
}

.title {
	margin: 24px 0 16px;
	color: #1f1f1f;
	font-size: 44px;
	font-weight: 400;
	line-height: 1.22;
}

.description {
	max-width: 460px;
	margin: 0;
	color: #1f1f1f;
	font-size: 16px;
	line-height: 1.5;
}

.formColumn {
	display: flex;
	min-width: 0;
	min-height: 312px;
	flex-direction: column;
	justify-content: center;
}

/* Flatten the form box so it sits on the card like the reference layout. */
.formColumn :global(.pong-form-box) {
	padding: 0;
	border: 0;
	border-radius: 0;
	background: transparent;
}

.formColumn :global(input:not([type='checkbox'])),
.formColumn :global(select) {
	height: 52px;
	border: 1px solid #747775;
	border-radius: 4px;
	background: #fff;
	font-size: 16px;
}

.formColumn :global(input:not([type='checkbox']):focus),
.formColumn :global(select:focus) {
	border-color: #0a73df;
	outline: 1px solid #0a73df;
}

.formColumn :global(.el-input__wrapper) {
	height: 52px;
	border-radius: 4px;
	background: #fff;
	box-shadow: 0 0 0 1px #747775 inset;
}

.formColumn :global(.el-input__wrapper.is-focus) {
	box-shadow: 0 0 0 2px #0a73df inset;
}

.formColumn :global(button[type='submit']) {
	height: 40px;
	border-radius: 4px;
	background: #0a73df;
	color: #fff;
	font-size: 14px;
	font-weight: 600;
	box-shadow: none;
}

.formColumn :global(button[type='submit']:hover:not(:disabled)) {
	background: #0869cc;
}

.guestSlot {
	display: flex;
	flex-direction: column;
	gap: 12px;
	margin-top: 20px;
}

.guestDivider {
	display: flex;
	align-items: center;
	gap: 12px;
	color: #5f6368;
	font-size: 13px;

	&::before,
	&::after {
		flex: 1;
		height: 1px;
		background: #dadce0;
		content: '';
	}
}

.footer {
	display: flex;
	min-height: 48px;
	align-items: center;
	justify-content: space-between;
	padding: 12px 18px 0;
	color: #444746;
	font-size: 13px;
}

.footerLanguage {
	padding: 4px 0;
}

.footerNav {
	display: flex;
	align-items: center;
	gap: 28px;

	a {
		color: inherit;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}
}

@media (max-width: 820px) {
	.card {
		grid-template-columns: minmax(0, 1fr);
		gap: 24px;
		padding: 24px;
	}

	.title {
		margin-top: 8px;
		font-size: 32px;
	}
}
</style>
