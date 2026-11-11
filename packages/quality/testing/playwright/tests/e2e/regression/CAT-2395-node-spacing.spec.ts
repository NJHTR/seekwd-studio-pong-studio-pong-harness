import { HTTP_REQUEST_NODE_NAME, EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';

// Canonical horizontal gap the auto-layout (dagre `ranksep` = GRID_SIZE * 8)
// leaves between adjacent nodes. The plus-button placement must match it so a
// freshly built workflow doesn't shift when the user runs Tidy-up.
const NODE_X_SPACING = 128;
// Small tolerance for node border widths in the rendered bounding box.
const GAP_TOLERANCE = 4;

// On-canvas node name differs from the node-creator search term (`Edit Fields (Set)`).
const DST_CANVAS_NAME = 'Edit Fields';

test.describe(
	'CAT-2395: consistent node spacing from the plus button',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test('keeps the canonical gap when adding a node off a default node, unchanged by Tidy-up', async ({
			pong,
		}) => {
			await pong.start.fromBlankCanvas();
			await pong.canvas.addNode(HTTP_REQUEST_NODE_NAME, { closeNDV: true });
			await pong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, {
				closeNDV: true,
				fromNode: HTTP_REQUEST_NODE_NAME,
			});

			// boundingBox() is screen px; normalize by zoom (pan cancels in an
			// edge-to-edge difference) so we compare logical units.
			const logicalGap = async () => {
				const src = await pong.canvas.nodeByName(HTTP_REQUEST_NODE_NAME).boundingBox();
				const dst = await pong.canvas.nodeByName(DST_CANVAS_NAME).boundingBox();
				expect(src).not.toBeNull();
				expect(dst).not.toBeNull();
				const zoom = await pong.canvas.getCanvasZoomLevel();
				return (dst!.x - (src!.x + src!.width)) / zoom;
			};

			// Pre-fix the plus button left 208 (7 dots); it must be the canonical 224/128.
			expect(Math.abs((await logicalGap()) - NODE_X_SPACING)).toBeLessThanOrEqual(GAP_TOLERANCE);

			// User-visible promise: Tidy-up must not re-space an already correctly-placed node.
			await pong.canvas.clickTidyUpButton();
			expect(Math.abs((await logicalGap()) - NODE_X_SPACING)).toBeLessThanOrEqual(GAP_TOLERANCE);
		});
	},
);
