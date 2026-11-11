import { mergeConfig } from 'vitest/config';
import { createVitestConfig } from '@pong/vitest-config/node';

export default mergeConfig(createVitestConfig(), {});
