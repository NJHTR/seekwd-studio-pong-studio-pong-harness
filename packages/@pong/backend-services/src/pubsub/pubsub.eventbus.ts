import { TypedEmitter } from '@pong/backend-common';
import { Service } from '@pong/di';

import type { PubSubEventMap } from '@pong/decorators';

@Service()
export class PubSubEventBus extends TypedEmitter<PubSubEventMap> {}
