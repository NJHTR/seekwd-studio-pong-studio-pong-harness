import type { ModuleInterface } from '@pong/decorators';
import { BackendModule } from '@pong/decorators';
import { Container } from '@pong/di';

@BackendModule({ name: 'favorites', instanceTypes: ['main'] })
export class FavoritesModule implements ModuleInterface {
	async init() {
		await import('./favorites.controller.js');

		const { FavoritesEventRelay } = await import('./favorites.event-relay.js');
		Container.get(FavoritesEventRelay).init();
	}

	async entities() {
		const { UserFavorite } = await import('./database/entities/user-favorite.entity.js');
		return [UserFavorite] as never;
	}
}
