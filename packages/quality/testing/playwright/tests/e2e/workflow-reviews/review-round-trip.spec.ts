import { nanoid } from 'nanoid';

import { EDIT_FIELDS_SET_NODE_NAME } from '../../../config/constants';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Turning reviews on changes what the Publish button does for every workflow on
// the instance, so this spec needs an instance of its own.
test.use({ capability: { env: { TEST_ISOLATION: 'workflow-reviews' } } });

/** Approval publishes the workflow, so it needs a trigger that can be activated. */
function scheduleTriggerNode() {
	return {
		id: nanoid(),
		name: 'Schedule Trigger',
		type: 'pong-nodes-base.scheduleTrigger',
		typeVersion: 1.2,
		position: [0, 0] as [number, number],
		parameters: { rule: { interval: [{ field: 'days' }] } },
	};
}

/**
 * The reviews module is only started at boot, and only if the license allows it,
 * so `enableFeature` alone cannot switch it on. Check it up front to fail with a
 * clear reason instead of a 404 halfway through the flow.
 */
async function assertReviewsModuleActive(api: ApiHelpers): Promise<void> {
	expect(
		await api.getActiveModules(),
		'the workflow-reviews module is not active: the instance needs a license granting feat:workflowReviews at startup',
	).toContain('workflow-reviews');
}

test.describe(
	'Workflow reviews @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		test('author and reviewer complete a review round trip', async ({ pong, api }) => {
			await api.enableFeature('workflowReviews');
			await api.enableFeature('personalSpacePolicy');
			await api.securitySettings.setWorkflowReviewsEnabled(true);
			await assertReviewsModuleActive(api);

			// Emails are lowercased when saved, and the reviewer picker filters
			// case-sensitively, so a mixed-case email would match nothing.
			const author = await api.publicApi.createUser({
				email: `author-${nanoid().toLowerCase()}@test.com`,
			});
			const reviewer = await api.publicApi.createUser({
				email: `reviewer-${nanoid().toLowerCase()}@test.com`,
			});
			// The author needs workflow:publish to submit, the reviewer workflow:read to decide
			const project = await api.projects.createProject(`Reviews ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, author.id, 'project:admin');
			await api.projects.addUserToProject(project.id, reviewer.id, 'project:editor');

			const authorApi = await api.createApiForUser(author);
			const workflowName = `Review Workflow ${nanoid(8)}`;
			const workflow = await authorApi.workflows.createWorkflow(
				{ name: workflowName, nodes: [scheduleTriggerNode()], connections: {}, settings: {} },
				project.id,
			);

			const reviewTitle = `Review ${nanoid(8)}`;
			const authorPong = await pong.start.withUser(author);
			const reviewerPong = await pong.start.withUser(reviewer);

			// --- The author submits the saved version for review ---
			await authorPong.start.fromExistingWorkflow(workflow.id);
			await authorPong.canvas.getOpenPublishModalButton().click();
			await expect(authorPong.workflowReviewControls.getPublishChoiceDialog()).toBeVisible();
			await authorPong.workflowReviewControls.chooseSubmitForReview();
			await authorPong.workflowReviewControls.submitForReview({
				versionName: 'Release candidate',
				title: reviewTitle,
				reviewerEmail: reviewer.email,
			});

			await expect(authorPong.workflowReviewControls.getStatusPill()).toHaveText(
				'Waiting for review',
			);

			// --- The reviewer finds it in the inbox, comments, and requests changes ---
			await reviewerPong.workflowReviews.goto();
			await reviewerPong.workflowReviews.openRequest(reviewTitle);
			await expect(reviewerPong.workflowReviews.getSelectedRequestTitle()).toHaveText(reviewTitle);
			await expect(reviewerPong.workflowReviews.getRequestRow(reviewTitle)).toContainText(
				workflowName,
			);

			const comment = `Please rename the trigger ${nanoid(6)}`;
			await reviewerPong.workflowReviews.postComment(comment);
			await expect(
				reviewerPong.workflowReviews.getActivityEntries().filter({ hasText: comment }),
			).toBeVisible();

			await reviewerPong.workflowReviews.requestChanges('Renaming needed before this goes live');

			// --- The author sees the decision, pushed to the open editor ---
			await expect(authorPong.workflowReviewControls.getStatusPill()).toHaveText(
				'Changes requested',
				{ timeout: 15_000 },
			);

			// --- The author saves a new version and pushes it into the review ---
			await authorPong.canvas.addNode(EDIT_FIELDS_SET_NODE_NAME, { closeNDV: true });
			await authorPong.canvas.waitForSaveWorkflowCompleted();
			await expect(authorPong.workflowReviewControls.getStatusPill()).toHaveText('Update review');
			await authorPong.workflowReviewControls.submitChangesToReview('Release candidate 2');

			// --- The reviewer approves, which publishes the reviewed version ---
			await reviewerPong.workflowReviews.approve('Looks good now');
			await expect(reviewerPong.workflowReviews.getSelectedRequestStatus()).toHaveAttribute(
				'aria-label',
				'Closed | Approved',
			);
			// Deciding refetches the review, so this summary has to appear on its own
			await expect(reviewerPong.workflowReviews.getClosedCallout()).toBeVisible();

			// Approval publishes the workflow on the author's behalf. Reloading because an
			// editor that was already open does not pick this up by itself.
			await authorPong.page.reload();
			await authorPong.canvas.waitForCanvasReady();
			await expect(authorPong.canvas.getPublishedIndicator()).toBeVisible();
		});
	},
);
