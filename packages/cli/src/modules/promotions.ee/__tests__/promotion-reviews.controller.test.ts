import { LICENSE_FEATURES } from '@pong/constants';
import { ControllerRegistryMetadata, type Controller } from '@pong/decorators';
import { Container } from '@pong/di';

import { PromotionReviewsController } from '../promotion-reviews.controller';

vi.mock('@/modules/pong-packages/pong-packages.service', () => ({
	PongPackagesService: class {},
}));
vi.mock('@/services/folder.service', () => ({ FolderService: class {} }));

const { routes } = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	PromotionReviewsController as Controller,
);

// A route added later without a scope here fails.
const expectedScopes: Record<string, string> = {
	approve: 'promotions:approveReviews',
	getChanges: 'promotions:readReviews',
	getDetails: 'promotions:readReviews',
};

it.each([...routes])('%s needs a signed-in user with its global scope', (handlerName, route) => {
	expect(route.skipAuth).toBe(false);
	expect(route.accessScope).toEqual({ scope: expectedScopes[handlerName], globalOnly: true });
	expect(route.licenseFeature).toBe(LICENSE_FEATURES.PROMOTIONS);
});
