import { chatModelsRequestSchema, Z } from '@pong/api-types';

export class ChatModelsRequestDto extends Z.class(chatModelsRequestSchema.shape) {}
