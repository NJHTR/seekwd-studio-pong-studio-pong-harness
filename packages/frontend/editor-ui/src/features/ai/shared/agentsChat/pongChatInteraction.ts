import {
	richCardComponentSchema,
	richMessageSchema,
	WORKFLOW_WAIT_SUSPEND_TYPE,
} from '@pong/api-types';
import type { RichCard, RichCardComponent, RichCardComponentType } from '@pong/api-types';
import { z } from 'zod';

/**
 * Single-operation integration action tool input — any `<platform>_action`
 * tool's `{ action, input: { message: { text?, card? } } }` shape, with the
 * message validated against the SAME `richMessageSchema` the backend tool
 * boundary uses (`@pong/api-types/agents/rich-card.schema.ts`). Batch inputs
 * (`actions: [...]`) never suspend and don't match this schema; they fall
 * back to raw JSON rendering.
 */
const actionToolInputSchema = z
	.object({
		action: z.string(),
		input: z
			.object({
				message: richMessageSchema,
			})
			.passthrough(),
	})
	.passthrough();

/** Resume payload shape shared with the platform card path (component-mapper / bridge). */
export const pongChatResumeValueSchema = z
	.object({ type: z.enum(['button', 'select']), value: z.string(), id: z.string().optional() })
	.passthrough();

export type PongChatCard = RichCard;
export type PongChatCardComponent = RichCardComponent;
export type PongChatResumeValue = z.infer<typeof pongChatResumeValueSchema>;

export interface PongChatInteractionInput {
	text?: string;
	card: PongChatCard;
}

const INTERACTIVE_COMPONENT_TYPES = new Set<RichCardComponent['type']>([
	'button',
	'select',
	'radio_select',
]);

/**
 * Mirrors the backend's shouldAwaitResponse: explicit flag or interactive components.
 *
 * @see shouldAwaitResponse in packages/cli/src/modules/agents/integrations/integration-tool-execution.ts
 */
export function isAwaitingCard(card: PongChatCard): boolean {
	if (card.awaitResponse === true) return true;
	return card.components.some(
		(component) =>
			INTERACTIVE_COMPONENT_TYPES.has(component.type) ||
			(component.type === 'section' && component.button !== undefined),
	);
}

/**
 * Parse any integration action tool input (slack_action, chat_action, …)
 * into its renderable card, or undefined when it carries none. Used for the
 * live pong chat cards and for session-log card previews of every integration.
 */
export function parseIntegrationActionCard(input: unknown): PongChatInteractionInput | undefined {
	const parsed = actionToolInputSchema.safeParse(input);
	if (!parsed.success) return undefined;
	const { message } = parsed.data.input;
	if (!message.card) return undefined;
	return { text: message.text, card: message.card };
}

/** Parse a persisted/live chat_action tool input into a renderable card, or undefined. */
export function parsePongChatActionInput(input: unknown): PongChatInteractionInput | undefined {
	return parseIntegrationActionCard(input);
}

/**
 * Suspend payload of a workflow tool parked on a Wait node — the same card the
 * chat platforms render, so it goes through the same card renderer here.
 *
 * @see buildWaitCard in packages/cli/src/modules/agents/tools/workflow-tool-factory.ts
 */
const waitSuspendPayloadSchema = z.object({
	type: z.literal(WORKFLOW_WAIT_SUSPEND_TYPE),
	title: z.string(),
	components: z.array(richCardComponentSchema).min(1),
});

/** Parse a Wait-node suspend payload into a renderable card, or undefined. */
export function parseWaitSuspendPayload(payload: unknown): PongChatInteractionInput | undefined {
	const parsed = waitSuspendPayloadSchema.safeParse(payload);
	if (!parsed.success) return undefined;
	return { card: { title: parsed.data.title, components: parsed.data.components } };
}

/**
 * Human-readable label for a card's resume value: the clicked button's label
 * or the chosen option's label, falling back to the raw value. Used for the
 * tool-step summary once an answered card clears from the chat.
 */
export function cardChoiceLabel(card: PongChatCard, resume: PongChatResumeValue): string {
	if (resume.type === 'button') {
		for (const component of card.components) {
			const candidates =
				component.type === 'button'
					? [component]
					: component.type === 'section' && component.button
						? [component.button]
						: [];
			for (const button of candidates) {
				if (button.value === resume.value) {
					// Same precedence the renderer uses for the visible button text.
					return button.label ?? button.text ?? resume.value;
				}
			}
		}
		return resume.value;
	}
	for (const component of card.components) {
		if (component.type !== 'select' && component.type !== 'radio_select') continue;
		if (resume.id !== undefined && component.id !== undefined && component.id !== resume.id) {
			continue;
		}
		const option = component.options.find((candidate) => candidate.value === resume.value);
		if (option) return option.label;
	}
	return resume.value;
}

/**
 * Component types the pong chat card renderer (`PongChatActionCard.vue`)
 * implements. Compile-time lockstep with the shared list: when
 * `RICH_CARD_COMPONENT_TYPES` in `@pong/api-types` gains a member (i.e. a new
 * component type is added for Slack & co), the assignment below fails to
 * compile until the renderer handles the new type and this list is extended.
 */
const RENDERED_CARD_COMPONENT_TYPES = [
	'section',
	'fields',
	'image',
	'divider',
	'button',
	'select',
	'radio_select',
] as const;

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const renderedCardComponentTypesInSync: MutuallyAssignable<
	(typeof RENDERED_CARD_COMPONENT_TYPES)[number],
	RichCardComponentType
> = true;
