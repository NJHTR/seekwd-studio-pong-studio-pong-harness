import { createVitestConfig } from '@pong/vitest-config/node';

export default createVitestConfig({
	globalSetup: ['./scripts/vitest-global-setup.ts'],
});
