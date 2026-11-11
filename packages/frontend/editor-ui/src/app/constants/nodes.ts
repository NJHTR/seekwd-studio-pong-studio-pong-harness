import type { NodeConnectionType } from 'pong-workflow';
import { NodeConnectionTypes } from 'pong-workflow';

export const DEFAULT_STICKY_HEIGHT = 160;
export const DEFAULT_STICKY_WIDTH = 240;

export const NODE_MIN_INPUT_ITEMS_COUNT = 4;

export const NODE_CONNECTION_TYPE_ALLOW_MULTIPLE: NodeConnectionType[] = [
	NodeConnectionTypes.AiTool,
	NodeConnectionTypes.Main,
];

export const RUN_DATA_DEFAULT_PAGE_SIZE = 25;
