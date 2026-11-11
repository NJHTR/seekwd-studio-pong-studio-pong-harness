import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import PongSettingsRow from './SettingsRow.vue';
import PongButton from '../PongButton';
import PongIcon from '../PongIcon';
import PongInput from '../PongInput';
import PongSettingsRowConfigure from '../PongSettingsRowConfigure';
import PongSettingsRowGroup from '../PongSettingsRowGroup';
import PongSwitch from '../PongSwitch';
import PongText from '../PongText';

const meta = {
	title: 'Areas/Settings/SettingsRow',
	component: PongSettingsRow,
	argTypes: {
		layout: { control: 'select', options: ['horizontal', 'vertical', 'custom'] },
		description: {
			control: 'text',
			description:
				'Short, scannable, plain-language summary of the setting (ideally one sentence). Keep it concise — link to the docs for anything longer rather than writing long inline copy.',
		},
		maxDescriptionLines: { control: { type: 'number', min: 1, max: 3 } },
		truncateTitle: { control: 'boolean' },
		showDivider: { control: 'boolean' },
		showVisual: { control: 'boolean' },
		actionMaxWidth: { control: 'text' },
		actionFill: { control: 'boolean' },
		expandLabel: { control: 'text' },
		collapseLabel: { control: 'text' },
		hoverable: { control: 'boolean' },
		clickable: { control: 'boolean' },
		revealActionsOnHover: { control: 'boolean' },
	},
	parameters: {
		docs: {
			description: {
				component:
					'The core description-list row: left info (title/description + optional leading visual) and an action slot, arranged horizontally, vertically, or as a fully custom full-width slot. In horizontal rows, action controls should use the medium size (`size="medium"`) so their height matches input fields and stays consistent across rows.\n\n**Writing the description:** keep it short, scannable, and plain-language — one clear sentence stating what the setting does or its current state. Avoid long, paragraph-length copy; descriptions clamp to `maxDescriptionLines` (max 3) and reveal the rest in a tooltip on hover, but that is a safety net, not a license to write long text. If a setting needs more explanation, link to the docs rather than inlining the detail.',
			},
		},
	},
} satisfies Meta<typeof PongSettingsRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const card = (inner: string) =>
	`<div style="max-width: 45rem;"><PongSettingsRowGroup>${inner}</PongSettingsRowGroup></div>`;

export const Default: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton },
		setup: () => ({ args }),
		template: card(`
			<PongSettingsRow v-bind="args">
				<template #action><PongButton variant="outline" size="medium" label="Change password" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Password',
		description: 'Last changed 4 months ago.',
		layout: 'horizontal',
	},
};

export const Variants: Story = {
	render: () => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton, PongInput, PongText },
		template: `
			<div style="display: flex; flex-direction: column; gap: 24px; max-width: 45rem;">
				<PongSettingsRowGroup>
					<PongSettingsRow layout="horizontal" title="Horizontal" description="Label and action sit side by side.">
						<template #action><PongButton variant="outline" size="medium" label="Edit" /></template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
				<PongSettingsRowGroup>
					<PongSettingsRow layout="vertical" title="Vertical" description="The action uses the full row width.">
						<template #action><PongInput placeholder="https://example.com/webhook" /></template>
					</PongSettingsRow>
				</PongSettingsRowGroup>
				<PongSettingsRowGroup>
					<PongSettingsRow layout="custom">
						<PongText>Custom layout renders the default slot at full width.</PongText>
					</PongSettingsRow>
				</PongSettingsRowGroup>
			</div>
		`,
	}),
};

export const Vertical: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongInput },
		setup: () => ({ args }),
		template: card(`
			<PongSettingsRow v-bind="args">
				<template #action><PongInput placeholder="https://example.com/webhook" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Webhook URL',
		description: 'The full action below gets the entire row width.',
		layout: 'vertical',
	},
};

// Bordered, rounded metrics card: three equal columns (tiles) separated by vertical dividers,
// built from DS border/radius/spacing tokens. Each tile shows a metric title, a "Last 7 days"
// sublabel, the big bold value, and either a colored trend delta (success/danger) or the muted
// "/ unlimited" suffix.
const metricTilesCard = `
	<div style="display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; border: var(--border-width, 1px) solid var(--border-color--subtle); border-radius: var(--radius--xs); overflow: clip;">
		<div
			v-for="(metric, index) in metrics"
			:key="metric.title"
			:style="{
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--spacing--2xs)',
				padding: 'var(--spacing--sm)',
				borderInlineStart: index > 0 ? 'var(--border-width, 1px) solid var(--border-color--subtle)' : '',
			}"
		>
			<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs);">
				<PongText size="small" color="text-base" tag="div">{{ metric.title }}</PongText>
				<PongText size="small" color="text-light" tag="div">Last 7 days</PongText>
			</div>
			<div style="display: flex; align-items: center; gap: var(--spacing--2xs);">
				<PongText size="xlarge" bold color="text-dark" tag="span">{{ metric.value }}</PongText>
				<PongText v-if="metric.suffix" size="small" color="text-light" tag="span">{{ metric.suffix }}</PongText>
				<span v-else style="display: inline-flex; align-items: center; gap: var(--spacing--5xs);">
					<PongIcon icon="triangle" :color="metric.delta" size="xsmall" />
					<PongText size="small" :color="metric.delta" tag="span">{{ metric.deltaText }}</PongText>
				</span>
			</div>
		</div>
	</div>
`;

export const Custom: Story = {
	render: () => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongText, PongIcon, PongButton },
		setup() {
			// `delta` drives the colored trend (success/danger); `suffix` is the muted
			// "/ unlimited" variant that has no trend arrow.
			const metrics = [
				{ title: 'Prod. executions', value: '23,432', delta: 'success', deltaText: '0.5pp' },
				{ title: 'Active workflows', value: '865', suffix: '/ unlimited' },
				{ title: 'Active users', value: '1.9%', delta: 'danger', deltaText: '0.5pp' },
			];
			return { metrics };
		},
		// "Usage" is a `vertical` row: its title is "Usage" and the full-width slot below holds
		// the bordered three-column metrics card. It composes inside a row group next to plain
		// horizontal rows (Plan, Billing) so the rich custom content reads naturally among
		// regular settings rows.
		template: card(`
			<PongSettingsRow layout="vertical" title="Usage">
				<template #action>${metricTilesCard}</template>
			</PongSettingsRow>
			<PongSettingsRow title="Plan">
				<template #action><PongText size="medium" color="text-dark">Enterprise</PongText></template>
			</PongSettingsRow>
			<PongSettingsRow title="Billing">
				<template #action><PongButton variant="outline" size="medium" label="Manage plan" /></template>
			</PongSettingsRow>
		`),
	}),
	parameters: {
		docs: {
			description: {
				story:
					'A `vertical` row whose title is "Usage" and whose full-width slot below holds a bordered three-column metrics card (with success/danger trend deltas), composed inside a row group alongside plain Plan/Billing rows. This is the recommended pattern for "a labelled row with rich custom content below the title".',
			},
		},
	},
};

export const WithVisual: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton, PongIcon },
		setup: () => ({ args }),
		template: card(`
			<PongSettingsRow v-bind="args">
				<template #visual><PongIcon icon="globe" /></template>
				<template #action><PongButton variant="outline" size="small" label="Log out" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Chrome 138 on macOS',
		description: 'Gdynia, Poland · active now',
		showVisual: true,
	},
};

export const WithoutDescription: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongSwitch },
		setup() {
			const enabled = ref(false);
			return { args, enabled };
		},
		template: card(`
			<PongSettingsRow v-bind="args">
				<template #action><PongSwitch v-model="enabled" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Compact mode',
	},
};

export const DescriptionTruncation: Story = {
	render: () => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongSwitch },
		setup() {
			const telemetry = ref(true);
			const heartbeat = ref(true);
			const longDescription =
				'Share anonymous usage data and diagnostic logs so we can understand how workflows are built, prioritise the improvements that matter most, and catch regressions early. You can turn this off at any time, and we never collect the contents of your workflows, your credentials, or the data your executions process.';
			return { telemetry, heartbeat, longDescription };
		},
		template: card(`
			<PongSettingsRow
				title="Telemetry & diagnostics"
				:description="longDescription"
				:max-description-lines="2"
			>
				<template #action><PongSwitch v-model="telemetry" /></template>
			</PongSettingsRow>
			<PongSettingsRow
				title="Instance heartbeat"
				description="Sends a lightweight ping so you can see when this instance is online."
			>
				<template #action><PongSwitch v-model="heartbeat" /></template>
			</PongSettingsRow>
		`),
	}),
	parameters: {
		docs: {
			description: {
				story:
					"The description clamps to `maxDescriptionLines` (max 3) with an ellipsis. When the copy actually overflows the clamp — like the first row — hovering (or focusing) it reveals the full text in a tooltip. Rows whose description already fits — like the second — show no tooltip, so the affordance is never redundant. Truncation is detected from the rendered element and re-evaluated on resize, so it stays correct as the row width changes.\n\n**Note:** the first row's description is unrealistically long purely to demonstrate the truncation + tooltip behavior — it is not a recommended pattern. In real settings, keep descriptions short and scannable (see the component docs) and link out for any longer detail.",
			},
		},
	},
};

export const ActionMaxWidth: Story = {
	render: () => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongInput, PongButton },
		template: card(`
			<PongSettingsRow
				title="Fill · 50% (default)"
				description="The recommended horizontal default: the action fills up to half the 720px row."
				action-fill
				action-max-width="50%"
			>
				<template #action><PongInput style="width: 100%" placeholder="Fills 50%" /></template>
			</PongSettingsRow>
			<PongSettingsRow
				title="Fill · 20%"
				description="A compact action; the info keeps the remaining ~80%."
				action-fill
				action-max-width="20%"
			>
				<template #action><PongInput style="width: 100%" placeholder="20%" /></template>
			</PongSettingsRow>
			<PongSettingsRow
				title="Fill · 5%"
				description="A minimal action — almost all the space goes to the info."
				action-fill
				action-max-width="5%"
			>
				<template #action>
					<PongButton style="width: 100%" variant="outline" size="medium" icon-only icon="ellipsis" aria-label="More" />
				</template>
			</PongSettingsRow>
			<PongSettingsRow
				title="Fill · 100% requested → still ~50%"
				description="In horizontal, a filled action shares the row with the info, so it stays about half even when you ask for more."
				action-fill
				action-max-width="100%"
			>
				<template #action><PongInput style="width: 100%" placeholder="Still ~50%" /></template>
			</PongSettingsRow>
			<PongSettingsRow
				title="Hug (default sizing)"
				description="Without fill, the action sizes to its own content and sits on the right."
			>
				<template #action><PongButton variant="outline" size="medium" label="Edit" /></template>
			</PongSettingsRow>
			<PongSettingsRow
				title="Override · uncapped (false)"
				description="action-max-width=false removes the cap, so intrinsically wide content can exceed 50%."
				:action-max-width="false"
			>
				<template #action><PongInput style="width: 30rem" placeholder="Wider than 50% — uncapped" /></template>
			</PongSettingsRow>
		`),
	}),
	parameters: {
		docs: {
			description: {
				story:
					'`actionMaxWidth` (horizontal only) accepts any CSS max-width string — percentages ("50%", the default), absolute lengths ("30rem", "200px") — or `false` to remove the cap. By default the action **hugs** its content; add `action-fill` so it **fills** up to the cap. A filled action also shares the row with the info, so it never grows past ~50% in horizontal even when the cap is higher; use `:action-max-width="false"` with intrinsically wide content to exceed that.',
			},
		},
	},
};

export const NoDivider: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton },
		setup: () => ({ args }),
		template: card(`
			<PongSettingsRow title="2 other active sessions" :show-divider="false">
				<template #action><PongButton variant="outline" size="small" label="Revoke all" /></template>
			</PongSettingsRow>
			<PongSettingsRow v-bind="args">
				<template #action><PongButton variant="outline" size="small" label="Revoke" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Safari on iPhone',
		description: 'Gdynia, Poland · last seen 4 hours ago',
	},
};

export const Expandable: Story = {
	render: () => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongSwitch, PongButton, PongInput },
		setup() {
			// The switch in the action slot owns the expanded state via `v-model`; the row
			// animates its `#expanded` region open/closed in response. `:disclosure="false"`
			// hides the built-in chevron since the switch is the trigger here.
			const enabled = ref(true);
			return { enabled };
		},
		template: card(`
			<PongSettingsRow
				title="Single sign-on (SSO)"
				description="Turn on to reveal the SSO configuration below."
				expandable
				:disclosure="false"
				v-model="enabled"
			>
				<template #action><PongSwitch v-model="enabled" /></template>
				<template #expanded>
					<PongSettingsRow title="Identity provider URL" layout="vertical">
						<template #action><PongInput placeholder="https://idp.example.com/sso" /></template>
					</PongSettingsRow>
					<PongSettingsRow title="Require SSO for all members" description="Members must sign in through your identity provider.">
						<template #action><PongButton variant="outline" size="medium" label="Configure" /></template>
					</PongSettingsRow>
					<PongSettingsRow title="Test connection" :show-divider="false">
						<template #action><PongButton variant="outline" size="medium" label="Run test" /></template>
					</PongSettingsRow>
				</template>
			</PongSettingsRow>
		`),
	}),
	parameters: {
		docs: {
			description: {
				story:
					'Stateful disclosure: the row exposes the expanded state through `v-model`, so any control can drive it. Here a switch in the action slot reveals nested settings rows with a ~200ms height + fade + blur animation (respecting `prefers-reduced-motion`).',
			},
		},
	},
};

export const ExpandableChevron: Story = {
	render: () => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton },
		setup() {
			const expanded = ref(false);
			return { expanded };
		},
		// The built-in chevron is the default trigger affordance: it carries `aria-expanded` /
		// `aria-controls` and rotates to reflect state. No `#action` control is required.
		template: card(`
			<PongSettingsRow
				title="Advanced options"
				description="Use the chevron to reveal the additional settings."
				expandable
				v-model="expanded"
			>
				<template #expanded>
					<PongSettingsRow title="Beta features" description="Opt into experimental functionality.">
						<template #action><PongButton variant="outline" size="medium" label="Manage" /></template>
					</PongSettingsRow>
					<PongSettingsRow title="Reset to defaults" :show-divider="false">
						<template #action><PongButton variant="outline" size="medium" label="Reset" /></template>
					</PongSettingsRow>
				</template>
			</PongSettingsRow>
		`),
	}),
	parameters: {
		docs: {
			description: {
				story:
					'When no action control drives the state, the built-in chevron disclosure (default `disclosure: true`) is the trigger — a text label ("View more" → "Show less", customizable via `expandLabel`/`collapseLabel`) beside a rotating chevron, fully keyboard operable with `aria-expanded`/`aria-controls`.',
			},
		},
	},
};

export const Hoverable: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton },
		setup: () => ({ args }),
		template: card(`
			<PongSettingsRow v-bind="args" hoverable>
				<template #action><PongButton variant="outline" size="small" label="Manage" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Hover me',
		description: 'A subtle hover background highlights the row.',
	},
};

export const Clickable: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongSettingsRowConfigure },
		setup() {
			const onRowClick = () => alert('Row clicked');
			return { args, onRowClick };
		},
		template: card(`
			<PongSettingsRow v-bind="args" clickable @click="onRowClick">
				<template #action><PongSettingsRowConfigure /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Passkey',
		description: 'Whole-row clickable with a text + chevron configure affordance.',
	},
};

export const ConfigureWithStatus: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongSettingsRowConfigure },
		setup() {
			const onRowClick = () => alert('Configure');
			return { args, onRowClick };
		},
		template: card(`
			<PongSettingsRow v-bind="args" clickable @click="onRowClick">
				<template #action><PongSettingsRowConfigure value="2 of 3 devices" /></template>
			</PongSettingsRow>
			<PongSettingsRow title="OAuth applications" description="Apps authorized to access your account." clickable @click="onRowClick">
				<template #action><PongSettingsRowConfigure /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Two-factor authentication',
		description:
			'The affordance shows "Configure" when unset, or the configured-state text once set up.',
	},
};

export const RevealActionsOnHover: Story = {
	render: (args) => ({
		components: { PongSettingsRow, PongSettingsRowGroup, PongButton, PongIcon },
		setup: () => ({ args }),
		template: card(`
			<PongSettingsRow v-bind="args" hoverable reveal-actions-on-hover show-visual>
				<template #visual><PongIcon icon="hard-drive" /></template>
				<template #action><PongButton variant="outline" size="small" label="Log out" /></template>
			</PongSettingsRow>
			<PongSettingsRow title="Safari on iPhone" description="Gdynia, Poland · last seen 4 hours ago" hoverable reveal-actions-on-hover show-visual>
				<template #visual><PongIcon icon="globe" /></template>
				<template #action><PongButton variant="outline" size="small" label="Revoke" /></template>
			</PongSettingsRow>
		`),
	}),
	args: {
		title: 'Chrome 138 on macOS',
		description: 'Gdynia, Poland · active now. Hover (or focus) to reveal the action.',
	},
};
