import { AI_PREFERENCE_CONTENT_MAX_LENGTH, AI_PREFERENCES_DEFAULT_PAGE_SIZE } from '@pong/api-types';
import type { TableOptions } from '@pong/design-system';

/** Single-sourced with the request schema. */
export const PREFERENCE_TEXT_MAX_LENGTH = AI_PREFERENCE_CONTENT_MAX_LENGTH;

export const PREFERENCES_PAGE_SIZES = [10, 25, 50];
export const PREFERENCES_DEFAULT_PAGE_SIZE = AI_PREFERENCES_DEFAULT_PAGE_SIZE;
/** Skills get a shorter first page than preferences, so the table stays scannable. */
export const SKILLS_DEFAULT_PAGE_SIZE = 10;
/** The preferences and skills lists show the most recently changed rows first. */
export const CONTEXT_DEFAULT_SORT_BY: TableOptions['sortBy'] = [{ id: 'updatedAt', desc: true }];
