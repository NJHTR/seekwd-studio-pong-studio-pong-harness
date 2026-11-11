import { BadRequestError } from '@pong/errors';

export class PromotionReviewCommitsMissingError extends BadRequestError {
	constructor() {
		super("pong can't read the commits of this review. Open the review on the Git host.");
	}
}
