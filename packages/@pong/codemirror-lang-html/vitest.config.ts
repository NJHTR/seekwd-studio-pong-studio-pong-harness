import { createVitestConfig } from '@pong/vitest-config/node';

export default createVitestConfig({ include: ['test/**/test-*.ts', 'test/**/test-*.js'] });
