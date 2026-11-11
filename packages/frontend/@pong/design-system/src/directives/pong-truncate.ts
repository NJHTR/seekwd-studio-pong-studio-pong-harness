import { truncate } from '@pong/utils/string/truncate';
import type { DirectiveBinding, FunctionDirective } from 'vue';

/**
 * Custom directive `pongTruncate` to truncate text content of an HTML element.
 *
 * Usage:
 * In your Vue template, use the directive `v-pong-truncate` with an argument to specify the length to truncate to.
 *
 * Example:
 * <p v-pong-truncate:10="'Some long text that will be truncated'" />
 *
 * This will truncate the text content of the paragraph to 10 characters.
 *
 * Hint: Do not use it on components
 * https://vuejs.org/guide/reusability/custom-directives#usage-on-components
 */

export const pongTruncate: FunctionDirective<HTMLElement, string> = (
	el: HTMLElement,
	binding: DirectiveBinding<string>,
) => {
	if (binding.value !== binding.oldValue) {
		el.textContent = truncate(binding.value ?? '', Number(binding.arg) || undefined);
	}
};
