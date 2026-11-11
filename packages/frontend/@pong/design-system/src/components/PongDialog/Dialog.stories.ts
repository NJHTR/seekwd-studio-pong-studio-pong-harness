import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, nextTick, ref, watch } from 'vue';

import {
	PongDialog,
	PongDialogBody,
	PongDialogClose,
	PongDialogHeader,
	PongDialogTitle,
	PongDialogDescription,
	PongDialogFooter,
	type DialogProps,
} from './index';
import { PongAlertDialog } from '../PongAlertDialog';
import PongButton from '../PongButton/Button.vue';
import PongCallout from '../PongCallout/Callout.vue';
import PongIcon from '../PongIcon/Icon.vue';
import PongCheckbox from '../../v2/components/Checkbox/Checkbox.vue';
import PongInput from '../PongInput/Input.vue';
import PongInputLabel from '../PongInputLabel/InputLabel.vue';
import PongSwitch2 from '../PongSwitch/Switch.vue';
import PongSelect2 from '../../v2/components/Select/Select.vue';
import PongText from '../PongText/Text.vue';

const meta = {
	title: 'Core/Dialog',
	component: PongDialog,
	parameters: {
		docs: {
			description: { component: 'A modal container for focused tasks and decisions.' },
			source: { type: 'dynamic' },
		},
	},
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['small', 'medium', 'large', 'xlarge', '2xlarge', 'fit', 'full', 'cover'],
		},
	},
} satisfies Meta<typeof PongDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

const contentPlaceholder = `
<div style="display: flex; flex: 1; align-items: center; justify-content: center; min-height: var(--spacing--4xl); padding: var(--spacing--md); border-radius: var(--radius); background-color: var(--color--background); color: var(--color--text--tint-1);">
	Content goes here
</div>
`;

export const Default: Story = {
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<PongDialogDescription>Make changes to your profile here. Click save when you're done.</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Save changes" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Edit Profile',
	},
} satisfies Story;

export const MultilineTitle: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A long title wraps onto more than one line. The close button stays aligned with the first line.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<PongDialogDescription>The title wraps. The close button stays on the first line.</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Save changes" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Review the workflow settings before you publish this version to the team',
	},
} satisfies Story;

export const Sizes: Story = {
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const sizes = ['small', 'medium', 'large', 'xlarge', 'full', 'cover'] as const;
			const openDialogs = ref<Record<string, boolean>>({});
			const openDialog = (size: string) => {
				openDialogs.value[size] = true;
			};
			return { sizes, openDialogs, openDialog };
		},
		template: `
		<div style="display: flex; gap: 16px;">
			<template v-for="size in sizes" :key="size">
				<PongButton variant="solid" :label="size" @click="openDialog(size)" />

				<PongDialog
					v-model:open="openDialogs[size]"
					:size="size"
					:header="size + ' Dialog'"
				>
					<PongDialogBody>
						<PongDialogDescription>This dialog has size={{ size }}</PongDialogDescription>
						${contentPlaceholder}
					</PongDialogBody>

					<PongDialogFooter>
						<PongDialogClose as-child>
							<PongButton variant="outline" label="Close" />
						</PongDialogClose>
					</PongDialogFooter>
				</PongDialog>
			</template>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithoutCloseButton: Story = {
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<PongDialogDescription>This dialog does not have a close button in the top right corner.</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>
				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Confirm" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		showCloseButton: false,
		header: 'No Close Button',
	},
} satisfies Story;

export const WithoutHeader: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Dialogs with a close button and no header. Use a centered icon when the message is a status or a short confirmation.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
			PongIcon,
		},
		setup() {
			const isOpen = ref(false);
			const isIconOpen = ref(false);
			return { args, isOpen, isIconOpen };
		},
		template: `
		<div style="display: flex; gap: var(--spacing--sm);">
			<PongButton variant="solid" label="Text" @click="isOpen = true" />
			<PongButton variant="solid" label="Icon" @click="isIconOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<PongDialogDescription>This dialog has no header. The close button stays in the corner.</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Close" />
					</PongDialogClose>
				</PongDialogFooter>
			</PongDialog>

			<PongDialog v-model:open="isIconOpen" size="small" aria-label="Workflow published">
				<PongDialogBody>
					<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--sm);">
						<PongIcon icon="circle-check" size="xxlarge" />
						<PongDialogDescription style="margin: 0; text-wrap: balance;">
							The workflow is published and ready for the team.
						</PongDialogDescription>
					</div>
				</PongDialogBody>

				<PongDialogFooter style="flex-direction: column;">
					<PongDialogClose as-child>
						<PongButton variant="solid" label="Done" style="width: 100%;" />
					</PongDialogClose>
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		ariaLabel: 'Notice',
	},
} satisfies Story;

export const WithoutFooter: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A dialog with no footer. The body keeps its bottom padding.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Workflow details" size="medium">
				<PongDialogBody>
					<PongDialogDescription>
						This dialog has no footer. The body keeps the space along its bottom edge.
					</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const StackedButtons: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A dialog with no header and stacked, full-width actions.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
			PongIcon,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" size="small" aria-label="Delete workflow">
				<PongDialogBody>
					<div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--spacing--sm);">
						<PongIcon icon="triangle-alert" color="danger" size="xxlarge" />
						<PongDialogDescription style="margin: 0; text-wrap: balance;">
							Delete this workflow? This cannot be undone.
						</PongDialogDescription>
					</div>
				</PongDialogBody>

				<PongDialogFooter style="flex-direction: column;">
					<PongDialogClose as-child>
						<PongButton variant="destructive" label="Delete" style="width: 100%;" />
					</PongDialogClose>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" style="width: 100%;" />
					</PongDialogClose>
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const ScrollableContent: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The body scrolls and the header and footer stay in place. Height examples set a smaller max height. Size examples use a dialog size, including cover.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const examples = [
				{ id: 'full', label: 'Full height' },
				{ id: '70vh', label: '70vh', maxHeight: '70vh' },
				{ id: '50vh', label: '50vh', maxHeight: '50vh' },
				{ id: '30vh', label: '30vh', maxHeight: '30vh' },
				{ id: 'small', label: 'Small', size: 'small' },
				{ id: 'medium', label: 'Medium', size: 'medium' },
				{ id: 'large', label: 'Large', size: 'large' },
				{ id: 'xlarge', label: 'XLarge', size: 'xlarge' },
				{ id: 'full-size', label: 'Full', size: 'full' },
				{ id: 'cover', label: 'Cover', size: 'cover' },
			] as const;
			const openDialogs = ref<Record<string, boolean>>({});
			const openDialog = (id: string) => {
				openDialogs.value[id] = true;
			};
			return { examples, openDialogs, openDialog };
		},
		template: `
		<div style="display: flex; flex-wrap: wrap; gap: var(--spacing--sm);">
			<template v-for="example in examples" :key="example.id">
				<PongButton variant="solid" :label="example.label" @click="openDialog(example.id)" />

				<PongDialog
					v-model:open="openDialogs[example.id]"
					:size="example.size || 'medium'"
					:header="'Terms of Service (' + example.label + ')'"
					:style="example.maxHeight ? { maxHeight: example.maxHeight } : undefined"
				>
					<PongDialogBody>
						<p
							v-for="i in 20"
							:key="i"
							:style="i < 20 ? 'margin: 0 0 var(--spacing--sm)' : 'margin: 0'"
						>
							Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
							tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
							veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
							commodo consequat.
						</p>
					</PongDialogBody>

					<PongDialogFooter>
						<PongDialogClose as-child>
							<PongButton variant="outline" label="Decline" />
						</PongDialogClose>
						<PongButton label="Accept" />
					</PongDialogFooter>
				</PongDialog>
			</template>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const ScrollFades: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The top fade appears after you scroll. The bottom fade stays while more content is below, and it disappears at the end.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			const scroller = ref<HTMLElement | null>(null);
			const showTopFade = ref(false);
			const showBottomFade = ref(false);

			function updateFades() {
				const element = scroller.value;
				if (!element) return;

				showTopFade.value = element.scrollTop > 1;
				showBottomFade.value = element.scrollTop + element.clientHeight < element.scrollHeight - 1;
			}

			watch(isOpen, async (open) => {
				if (!open) return;
				await nextTick();
				requestAnimationFrame(() => {
					updateFades();
				});
			});

			return { isOpen, scroller, showTopFade, showBottomFade, updateFades };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Release notes" size="medium" style="max-height: 50vh;">
				<PongDialogBody style="padding: 0; overflow: hidden;">
					<div style="position: relative; display: flex; flex: 1; min-height: 0; --dialog-fade: light-dark(var(--color--neutral-white), var(--color--neutral-800));">
						<div
							ref="scroller"
							style="flex: 1; min-height: 0; overflow: auto; padding: var(--pong-dialog-region--padding, var(--spacing--md));"
							@scroll="updateFades"
						>
							<p
								v-for="i in 16"
								:key="i"
								:style="i < 16 ? 'margin: 0 0 var(--spacing--sm)' : 'margin: 0'"
							>
								Version notes for this release. Scroll to read the changes. The fades show when more text sits above or below this area.
							</p>
						</div>
						<div
							v-show="showTopFade"
							aria-hidden="true"
							style="position: absolute; top: 0; right: 0; left: 0; height: var(--spacing--xl); pointer-events: none; background: linear-gradient(to bottom, var(--dialog-fade) 0%, color-mix(in srgb, var(--dialog-fade) 0%, transparent) 100%);"
						></div>
						<div
							v-show="showBottomFade"
							aria-hidden="true"
							style="position: absolute; right: 0; bottom: 0; left: 0; height: var(--spacing--xl); pointer-events: none; background: linear-gradient(to top, var(--dialog-fade) 0%, color-mix(in srgb, var(--dialog-fade) 0%, transparent) 100%);"
						></div>
					</div>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Close" />
					</PongDialogClose>
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const NonStickyFooter: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Place the actions inside the body. They scroll with the terms. The reader reaches them at the end.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Terms of Service" size="medium" style="max-height: 50vh;">
				<PongDialogBody>
					<p
						v-for="i in 12"
						:key="i"
						style="margin: 0 0 var(--spacing--sm)"
					>
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
						tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
						veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
						commodo consequat.
					</p>
					<div style="display: flex; justify-content: flex-end; gap: var(--spacing--2xs);">
						<PongDialogClose as-child>
							<PongButton variant="outline" label="Decline" />
						</PongDialogClose>
						<PongButton label="Agree" />
					</div>
				</PongDialogBody>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const Sidebar: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The dialog does not scroll. Set overflow on the regions that should scroll. The sidebar and the main area scroll on their own. The header and the footer stay in place.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			const sections = [
				'General',
				'Execution',
				'Error handling',
				'Credentials',
				'Sharing',
				'History',
				'Notifications',
				'Timezone',
				'Data retention',
				'Security',
				'Audit log',
				'Advanced',
				'Appearance',
				'Language',
				'API',
				'Webhooks',
				'Variables',
				'Environments',
				'Permissions',
				'Usage',
			];
			return { isOpen, sections };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Workflow settings" size="2xlarge" style="max-height: 70vh;">
				<PongDialogBody style="padding: 0; overflow: hidden; border-block: var(--border);">
					<div style="display: flex; flex: 1; min-height: 0; overflow: hidden;">
						<nav
							aria-label="Settings sections"
							style="display: flex; flex: 0 0 calc(var(--spacing--4xl) + var(--spacing--3xl)); flex-direction: column; gap: var(--spacing--5xs); min-height: 0; overflow: auto; padding: var(--spacing--xs); border-inline-end: var(--border);"
						>
							<button
								v-for="(section, index) in sections"
								:key="section"
								type="button"
								:style="index === 0
									? 'padding: var(--spacing--2xs) var(--spacing--xs); border: 0; border-radius: var(--radius); background-color: var(--color--background); color: var(--color--text); font: inherit; font-size: var(--font-size--sm); line-height: var(--line-height--sm); text-align: start; cursor: pointer;'
									: 'padding: var(--spacing--2xs) var(--spacing--xs); border: 0; border-radius: var(--radius); background: transparent; color: var(--color--text); font: inherit; font-size: var(--font-size--sm); line-height: var(--line-height--sm); text-align: start; cursor: pointer;'"
							>
								{{ section }}
							</button>
						</nav>

						<div style="flex: 1; min-height: 0; overflow: auto; padding: var(--pong-dialog-region--padding, var(--spacing--md));">
							<p
								v-for="i in 12"
								:key="i"
								:style="i < 12 ? 'margin: 0 0 var(--spacing--sm)' : 'margin: 0'"
							>
								General settings control how this workflow runs. Change the name, the timezone, and the error behavior here. These paragraphs are long so this region scrolls on its own.
							</p>
						</div>
					</div>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Save" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const WithCallout: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A warning callout replaces the description at the top of the body.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
			PongCallout,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Publish workflow" size="medium">
				<PongDialogBody>
					<PongCallout theme="warning" style="margin: 0 0 var(--spacing--sm);">
						This workflow is shared. Publishing it updates the version the team uses.
					</PongCallout>
					${contentPlaceholder}
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Publish" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const AccessibilityFallback: Story = {
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px">
			<p style="max-width: 500px; color: var(--color--text--tint-1);">
				This dialog uses <code>ariaLabel</code> and <code>ariaDescription</code> props instead of
				<code>PongDialogTitle</code> and <code>PongDialogDescription</code> components.
				The title and description are visually hidden but accessible to screen readers.
			</p>

			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<div>
						<p style="font-weight: var(--font-weight--bold); margin-bottom: var(--spacing--xs);">
							Custom Visual Title
						</p>
						<p>
							This dialog has no visible DialogTitle or DialogDescription components,
							but screen readers will announce "Delete Confirmation" as the title
							and the description text for accessibility.
						</p>
					</div>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="subtle" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Delete" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		ariaLabel: 'Delete Confirmation',
		ariaDescription: 'Are you sure you want to delete this item? This action cannot be undone.',
	},
} satisfies Story;

export const AccessibilityFallbackTitleOnly: Story = {
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 16px">
			<p style="max-width: 500px; color: var(--color--text--tint-1);">
				This dialog only uses the <code>ariaLabel</code> prop for an accessible title.
				Useful for simple confirmation dialogs or icon-only interfaces.
			</p>

			<PongButton variant="solid" label="Quick Action" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args" size="small">
				<PongDialogBody>
					<p>Complete this action?</p>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="subtle" label="No" />
					</PongDialogClose>
					<PongButton label="Yes" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		ariaLabel: 'Confirm Action',
	},
} satisfies Story;

export const CustomHeader: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Put a back button, a title, a subtitle, a save button, and a close button on one row. Hide the default close button when the header includes its own.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogHeader,
			PongDialogTitle,
			PongDialogClose,
			PongButton,
			PongText,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog
				v-model:open="isOpen"
				size="medium"
				aria-label="Slack account"
				:show-close-button="false"
			>
				<PongDialogHeader style="flex-direction: row; align-items: center; gap: var(--spacing--xs);">
					<PongButton variant="ghost" icon="arrow-left" icon-only aria-label="Back" />
					<div style="display: flex; flex: 1; flex-direction: column; gap: var(--spacing--5xs); min-width: 0;">
						<PongDialogTitle>Slack account</PongDialogTitle>
						<PongText size="small" color="text-light">Slack OAuth2 API</PongText>
					</div>
					<PongButton label="Save" />
					<PongDialogClose as-child>
						<PongButton variant="ghost" icon="x" icon-only aria-label="Close" />
					</PongDialogClose>
				</PongDialogHeader>

				<PongDialogBody>
					${contentPlaceholder}
				</PongDialogBody>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const CustomFooter: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A dialog with a custom footer. The body has no bottom padding, because the footer supplies that space.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Publish workflow" size="medium">
				<PongDialogBody>
					<PongDialogDescription>
						Review the workflow, then publish it for the team.
					</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>

				<PongDialogFooter>
					<span style="margin-inline-end: auto; align-self: center; font-size: var(--font-size--sm); line-height: var(--line-height--sm); color: var(--color--text--tint-1);">
						Last saved 2 minutes ago
					</span>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton label="Publish" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const SearchHeader: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Put the search in the header. Set a fixed height on the dialog so it stays the same size while the list filters. Zero the body padding so the scrollbar sits on the dialog edge. The list padding keeps the rows in line with the search.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogHeader,
			PongDialogTitle,
			PongButton,
			PongIcon,
			PongInput,
		},
		setup() {
			const isOpen = ref(false);
			const query = ref('');
			const projects = [
				'Alpha',
				'Beta',
				'Northwind onboarding workspace',
				'Delta',
				'Echo',
				'Foxtrot',
				'Gamma',
				'Hotel',
				'India',
				'Juliet',
				'Kilo',
				'Lima',
				'Mike',
				'November',
				'Oscar',
				'Papa',
				'Quebec',
				'Romeo',
			];
			const visibleProjects = computed(() => {
				const term = query.value.trim().toLowerCase();
				if (!term) return projects;
				return projects.filter((project) => project.toLowerCase().includes(term));
			});
			return { isOpen, query, visibleProjects };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open Dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" size="medium" style="height: 50vh;">
				<PongDialogHeader style="flex-direction: column; align-items: stretch; padding-inline-end: var(--pong-dialog-region--padding, var(--spacing--md)); gap: var(--spacing--sm);">
					<PongDialogTitle style="padding-inline-end: calc(var(--pong-dialog-close--size, var(--spacing--lg)) + var(--spacing--xs));">
						Projects
					</PongDialogTitle>
					<PongInput v-model="query" placeholder="Search projects" clearable>
						<template #prefix>
							<PongIcon icon="search" />
						</template>
					</PongInput>
				</PongDialogHeader>
				<PongDialogBody style="padding: 0;">
					<div style="padding-inline: var(--pong-dialog-region--padding, var(--spacing--md)); padding-block-end: var(--pong-dialog-region--padding, var(--spacing--md));">
						<p
							v-if="visibleProjects.length === 0"
							style="margin: 0; padding: var(--spacing--sm) 0; text-align: center; color: var(--color--text--tint-1); font-size: var(--font-size--sm);"
						>
							No projects match your search.
						</p>
						<div
							v-for="(project, index) in visibleProjects"
							:key="project"
							:style="index < visibleProjects.length - 1
								? 'padding: var(--spacing--xs) 0; border-bottom: var(--border);'
								: 'padding: var(--spacing--xs) 0;'"
						>
							{{ project }}
						</div>
					</div>
				</PongDialogBody>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

const roleItems = [
	{ label: 'Admin', value: 'admin' },
	{ label: 'Member', value: 'member' },
	{ label: 'Viewer', value: 'viewer' },
];

export const Form: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A dialog with form fields. Tab moves through the fields and actions, then the close button.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
			PongCheckbox,
			PongInput,
			PongInputLabel,
			PongSelect2,
			PongSwitch2,
		},
		setup() {
			const isOpen = ref(false);
			const name = ref('');
			const email = ref('');
			const role = ref<string | undefined>();
			const notes = ref('');
			const notify = ref(true);
			const active = ref(false);

			function onSubmit(event: Event) {
				event.preventDefault();
				isOpen.value = false;
			}

			return { isOpen, name, email, role, notes, notify, active, roleItems, onSubmit };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Edit profile" @click="isOpen = true" />

			<PongDialog
				v-model:open="isOpen"
				header="Edit profile"
			>
				<PongDialogBody>
					<PongDialogDescription>Update the details for this profile.</PongDialogDescription>
					<form
						id="dialog-profile-form"
						style="display: flex; flex-direction: column; gap: var(--spacing--md);"
						@submit="onSubmit"
					>
						<PongInputLabel label="Name" input-name="profile-name" required>
							<PongInput
								id="profile-name"
								v-model="name"
								name="name"
								placeholder="Ada Lovelace"
								size="small"
								required
							/>
						</PongInputLabel>

						<PongInputLabel label="Email" input-name="profile-email">
							<PongInput
								id="profile-email"
								v-model="email"
								name="email"
								type="email"
								placeholder="ada@example.com"
								size="small"
							/>
						</PongInputLabel>

						<PongInputLabel label="Role" input-name="profile-role">
							<PongSelect2
								id="profile-role"
								v-model="role"
								:items="roleItems"
								placeholder="Select a role"
								clearable
							/>
						</PongInputLabel>

						<PongInputLabel label="Notes" input-name="profile-notes">
							<PongInput
								id="profile-notes"
								v-model="notes"
								name="notes"
								type="textarea"
								placeholder="Add a note"
								:rows="3"
							/>
						</PongInputLabel>

						<PongCheckbox v-model="notify" label="Send a confirmation email" />
						<PongSwitch2 v-model="active" label="Active" />
					</form>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton type="submit" form="dialog-profile-form" label="Save" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

const datasetItems = [
	{ label: 'Support replies', value: 'support' },
	{ label: 'Product questions', value: 'product' },
	{ label: 'Onboarding chats', value: 'onboarding' },
];

export const MultistepForm: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A form split across steps, such as creating a collection. The header shows the step. The body shows that step. Back and Next stay in the footer.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogHeader,
			PongDialogTitle,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
			PongInput,
			PongInputLabel,
			PongSelect2,
			PongText,
		},
		setup() {
			const isOpen = ref(false);
			const step = ref(0);
			const name = ref('');
			const dataset = ref<string | undefined>();
			const steps = [
				{ title: 'Name the collection' },
				{ title: 'Choose a dataset' },
				{ title: 'Review the collection' },
			];
			const datasetLabel = computed(
				() => datasetItems.find((item) => item.value === dataset.value)?.label ?? 'None',
			);

			function back() {
				if (step.value > 0) step.value -= 1;
			}

			function next() {
				if (step.value < steps.length - 1) {
					step.value += 1;
					return;
				}
				isOpen.value = false;
			}

			watch(isOpen, (open) => {
				if (!open) step.value = 0;
			});

			return {
				isOpen,
				step,
				name,
				dataset,
				steps,
				datasetItems,
				datasetLabel,
				back,
				next,
			};
		},
		template: `
		<div>
			<PongButton variant="solid" label="New collection" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" size="medium" aria-label="New collection">
				<PongDialogHeader>
					<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
						<PongText size="xsmall" color="text-light" bold tag="p" style="margin: 0;">
							Step {{ step + 1 }} of {{ steps.length }}
						</PongText>
						<PongDialogTitle>{{ steps[step].title }}</PongDialogTitle>
					</div>
				</PongDialogHeader>

				<PongDialogBody>
					<div v-if="step === 0" style="display: flex; flex-direction: column; gap: var(--spacing--md);">
						<PongDialogDescription style="margin: 0;">
							Give the collection a name. You can change it later.
						</PongDialogDescription>
						<PongInputLabel label="Name" input-name="collection-name" required>
							<PongInput
								id="collection-name"
								v-model="name"
								name="collection-name"
								placeholder="Support quality"
								size="small"
							/>
						</PongInputLabel>
					</div>

					<div v-else-if="step === 1" style="display: flex; flex-direction: column; gap: var(--spacing--md);">
						<PongDialogDescription style="margin: 0;">
							Choose the dataset this collection compares.
						</PongDialogDescription>
						<PongInputLabel label="Dataset" input-name="collection-dataset">
							<PongSelect2
								id="collection-dataset"
								v-model="dataset"
								:items="datasetItems"
								placeholder="Select a dataset"
								clearable
							/>
						</PongInputLabel>
					</div>

					<div v-else style="display: flex; flex-direction: column; gap: var(--spacing--md);">
						<PongDialogDescription style="margin: 0;">
							Check the details, then create the collection.
						</PongDialogDescription>
						<p style="margin: 0; font-size: var(--font-size--sm); line-height: var(--line-height--sm);">
							<strong>{{ name || 'Untitled collection' }}</strong> uses {{ datasetLabel }}.
						</p>
					</div>
				</PongDialogBody>

				<PongDialogFooter>
					<PongButton variant="outline" label="Back" :disabled="step === 0" @click="back" />
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton :label="step < steps.length - 1 ? 'Next' : 'Create'" @click="next" />
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {},
} satisfies Story;

export const NoCloseOnOverlayClick: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Set closeOnOverlayClick to false. A click on the overlay leaves the dialog open. Escape and the close button still close it.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<p>Click the overlay. This dialog stays open.</p>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Close" />
					</PongDialogClose>
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Keep this open',
		closeOnOverlayClick: false,
	},
} satisfies Story;

export const NoCloseOnEscape: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Set closeOnEscape to false. Escape leaves the dialog open. An overlay click and the close button still close it.',
			},
		},
	},
	render: (args: DialogProps) => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogFooter,
			PongDialogClose,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" v-bind="args">
				<PongDialogBody>
					<p>Press Escape. This dialog stays open.</p>
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Close" />
					</PongDialogClose>
				</PongDialogFooter>
			</PongDialog>
		</div>
		`,
	}),
	args: {
		size: 'medium',
		header: 'Keep this open',
		closeOnEscape: false,
	},
} satisfies Story;

export const StackedDialogs: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Open a dialog, then open an alert dialog on top of it. Set stacked on the alert dialog so it renders above the first dialog.',
			},
		},
	},
	render: () => ({
		components: {
			PongDialog,
			PongDialogBody,
			PongDialogDescription,
			PongDialogFooter,
			PongDialogClose,
			PongAlertDialog,
			PongButton,
		},
		setup() {
			const isOpen = ref(false);
			const isAlertOpen = ref(false);
			const onDelete = () => {
				isAlertOpen.value = false;
				isOpen.value = false;
			};
			return { isOpen, isAlertOpen, onDelete };
		},
		template: `
		<div>
			<PongButton variant="solid" label="Open dialog" @click="isOpen = true" />

			<PongDialog v-model:open="isOpen" header="Project settings">
				<PongDialogBody>
					<PongDialogDescription>Update the project, or delete it.</PongDialogDescription>
					${contentPlaceholder}
				</PongDialogBody>

				<PongDialogFooter>
					<PongDialogClose as-child>
						<PongButton variant="outline" label="Cancel" />
					</PongDialogClose>
					<PongButton variant="destructive" label="Delete project" @click="isAlertOpen = true" />
				</PongDialogFooter>
			</PongDialog>

			<PongAlertDialog
				v-model:open="isAlertOpen"
				stacked
				title="Delete project?"
				description="This permanently deletes the project and its workflows. This can't be undone."
				action-label="Delete project"
				action-variant="destructive"
				@action="onDelete"
			/>
		</div>
		`,
	}),
	args: {},
} satisfies Story;
