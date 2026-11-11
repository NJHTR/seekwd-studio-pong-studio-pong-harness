import { z } from 'zod';

/**
 * An entity id as exchanged over the API. 36 chars covers both id formats
 * pong uses: nanoid (16) for most resources and UUID (36) for users.
 */
export const pongIdSchema = z.string().min(1).max(36);
