import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testFolder = mkdtempSync(join(tmpdir(), 'pong-backend-services-'));

process.env.PONG_USER_FOLDER = testFolder;
process.env.PONG_ENCRYPTION_KEY = 'test-key';

afterAll(() => {
	rmSync(testFolder, { recursive: true, force: true });
});
