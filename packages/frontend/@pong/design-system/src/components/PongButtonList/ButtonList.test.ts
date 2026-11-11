import { render } from '@testing-library/vue';

import PongButtonList from './ButtonList.vue';

describe('components', () => {
	describe('PongButtonList', () => {
		it('should render with default horizontal orientation', () => {
			const { container } = render(PongButtonList, {
				slots: {
					default: '<button>One</button><button>Two</button>',
				},
			});

			const group = container.querySelector('[role="group"]');
			expect(group).toBeTruthy();
			expect(group?.className).toMatch(/horizontal/);
		});

		it('should apply vertical orientation', () => {
			const { container } = render(PongButtonList, {
				props: {
					orientation: 'vertical',
				},
				slots: {
					default: '<button>One</button><button>Two</button>',
				},
			});

			const group = container.querySelector('[role="group"]');
			expect(group?.className).toMatch(/vertical/);
		});

		it('should not apply toolbar style by default', () => {
			const { container } = render(PongButtonList, {
				slots: {
					default: '<button>One</button>',
				},
			});

			const group = container.querySelector('[role="group"]');
			expect(group?.className).not.toMatch(/toolbar/);
		});

		it('should apply toolbar variant', () => {
			const { container } = render(PongButtonList, {
				props: {
					variant: 'toolbar',
				},
				slots: {
					default: '<button>One</button><button>Two</button>',
				},
			});

			const group = container.querySelector('[role="group"]');
			expect(group?.className).toMatch(/toolbar/);
		});

		it('should render slotted content', () => {
			const { getByText } = render(PongButtonList, {
				slots: {
					default: '<button>Save</button><button>Publish</button>',
				},
			});

			expect(getByText('Save')).toBeTruthy();
			expect(getByText('Publish')).toBeTruthy();
		});
	});
});
