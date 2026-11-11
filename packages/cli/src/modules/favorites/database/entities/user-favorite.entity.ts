import type { FavoriteResourceType } from '@pong/api-types';
import { User } from '@pong/db';
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from '@pong/typeorm';

@Entity('user_favorites')
@Unique(['userId', 'resourceId', 'resourceType'])
@Index(['userId'])
export class UserFavorite {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	user: User;

	@Column({ type: String })
	userId: string;

	@Column({ type: String })
	resourceId: string;

	@Column({ type: String })
	resourceType: FavoriteResourceType;
}
