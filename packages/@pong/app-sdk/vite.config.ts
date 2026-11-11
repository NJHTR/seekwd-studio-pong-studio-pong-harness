import { vitestConfig } from '@pong/vitest-config/node';
import { defineConfig, mergeConfig } from 'vite';

export default mergeConfig(defineConfig({}), vitestConfig);
