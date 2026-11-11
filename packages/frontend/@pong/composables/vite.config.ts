import { defineConfig, mergeConfig } from 'vite';
import { vitestConfig } from '@pong/vitest-config/frontend';

export default mergeConfig(defineConfig({}), vitestConfig);
