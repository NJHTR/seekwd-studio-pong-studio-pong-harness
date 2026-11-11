import { render } from '@testing-library/vue';

import { pongTruncate } from './pong-truncate';

describe('Directive pong-truncate', () => {
	it('should truncate text to 30 chars by default', async () => {
		const { html } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-pong-truncate="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						pongTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text that ...</div>');
	});

	it('should truncate text to 30 chars in case of wrong argument', async () => {
		const { html } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-pong-truncate:ab="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						pongTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text that ...</div>');
	});

	it('should truncate text to given length', async () => {
		const { html } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-pong-truncate:25="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						pongTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text ...</div>');
	});

	it('rendered html should update when the value changes', async () => {
		const { html, rerender } = render(
			{
				props: {
					text: {
						type: String,
					},
				},
				template: '<div v-pong-truncate:25="text" />',
			},
			{
				props: {
					text: 'This is a very long text that should be truncated',
				},
				global: {
					directives: {
						pongTruncate,
					},
				},
			},
		);
		expect(html()).toBe('<div>This is a very long text ...</div>');

		await rerender({ text: 'new text to truncate that should be truncated' });

		expect(html()).toBe('<div>new text to truncate that...</div>');
	});
});
