import { render } from '@testing-library/vue';

import PongText from '../PongText';
import PongNotice from './Notice.vue';
import { pongHtml } from '../../directives';

describe('components', () => {
	describe('PongNotice', () => {
		it('should render correctly', () => {
			const wrapper = render(PongNotice, {
				props: {
					id: 'notice',
				},
				slots: {
					default: 'This is a notice.',
				},
				global: {
					stubs: ['PongText'],
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		describe('props', () => {
			describe('content', () => {
				it('should render correctly with content prop', () => {
					const wrapper = render(PongNotice, {
						props: {
							id: 'notice',
							content: 'This is a notice.',
						},
						global: {
							stubs: ['PongText'],
						},
					});
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should render HTML', () => {
					const wrapper = render(PongNotice, {
						props: {
							id: 'notice',
							content: '<a href="https://example.com">Hello world!</a> This is a notice.',
						},
						global: {
							directives: {
								pongHtml,
							},
							components: {
								PongText,
							},
						},
					});

					expect(wrapper.container.querySelectorAll('a')).toHaveLength(1);
					expect(wrapper.html()).toMatchSnapshot();
				});

				it('should sanitize rendered HTML', () => {
					const wrapper = render(PongNotice, {
						props: {
							id: 'notice',
							content: '<script>alert(1);</script> This is a notice.',
						},
						global: {
							stubs: ['PongText'],
						},
					});

					expect(wrapper.container.querySelector('script')).not.toBeTruthy();
					expect(wrapper.html()).toMatchSnapshot();
				});
			});
		});
	});
});
