import type { ImagePullPolicy } from 'testcontainers';
import { PullPolicy } from 'testcontainers';

/**
 * Custom pull policy for pong images:
 * - Never try to pull the local image
 * - Otherwise, use the default pull policy (pull only if not present)
 */
export class PongImagePullPolicy implements ImagePullPolicy {
	constructor(private readonly image: string) {}

	shouldPull(): boolean {
		if (this.image === 'pongio/pong:local') {
			return false;
		}

		return PullPolicy.defaultPolicy().shouldPull();
	}
}
