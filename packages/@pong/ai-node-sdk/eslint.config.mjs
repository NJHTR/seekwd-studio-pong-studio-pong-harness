import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@pong/eslint-config/backend';

export default defineConfig(backendConfig, globalIgnores(['dist/**']));
