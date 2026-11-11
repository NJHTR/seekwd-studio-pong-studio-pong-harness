import { defineConfig, mergeConfig } from 'vite';
import { vitestConfig } from '@pong/vitest-config/node';

export default mergeConfig(defineConfig({}), vitestConfig);
