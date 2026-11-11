import { render } from '@testing-library/vue';

import { pongHtml } from './pong-html';

const TestComponent = {
	props: {
		html: {
			type: String,
		},
	},
	template: '<div v-pong-html="html"></div>',
};

describe('Directive pong-html', () => {
	it('should sanitize html', async () => {
		const { html } = render(TestComponent, {
			props: {
				html: '<span>text</span><a href="https://malicious.com" onclick="alert(1)">malicious</a><img alt="Ok" src="./images/logo.svg" onerror="alert(2)" /><script>alert(3)</script>',
			},
			global: {
				directives: {
					pongHtml,
				},
			},
		});
		expect(html()).toBe(
			'<div><span>text</span><a href="https://malicious.com">malicious</a><img alt="Ok" src="./images/logo.svg"></div>',
		);
	});

	it('should not touch safe html', async () => {
		const { html } = render(TestComponent, {
			props: {
				html: '<span>text</span><a href="https://safe.com">safe</a><img alt="Ok" src="./images/logo.svg" />',
			},
			global: {
				directives: {
					pongHtml,
				},
			},
		});
		expect(html()).toBe(
			'<div><span>text</span><a href="https://safe.com">safe</a><img alt="Ok" src="./images/logo.svg"></div>',
		);
	});
});
