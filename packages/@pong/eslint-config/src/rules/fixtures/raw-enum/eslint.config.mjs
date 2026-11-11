import { localRulesPlugin } from '@pong/eslint-config/plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config({
	files: ['**/*.ts'],
	languageOptions: { parser: tseslint.parser },
	plugins: { 'pong-local-rules': localRulesPlugin },
	rules: { 'pong-local-rules/no-raw-enum': 'error' },
});
