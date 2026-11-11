import type { ApprovePromotionReviewDto, InboxPromotionReviewItem } from '@pong/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@pong/rest-api-client';

export async function approvePromotionReview(
	context: IRestApiContext,
	reviewId: string,
	payload: ApprovePromotionReviewDto,
): Promise<InboxPromotionReviewItem> {
	return await makeRestApiRequest<InboxPromotionReviewItem>(
		context,
		'POST',
		`/promotions/reviews/${encodeURIComponent(reviewId)}/approve`,
		{ ...payload },
	);
}
