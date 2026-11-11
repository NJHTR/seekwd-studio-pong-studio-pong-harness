import path from 'node:path';

/**
 * Computes the pong folder path based on environment variables.
 * This is used by various configs that need to know the pong installation directory.
 */
export function getPongFolder(): string {
	const homeVarName = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
	const userHome = process.env.PONG_USER_FOLDER ?? process.env[homeVarName] ?? process.cwd();
	return path.join(userHome, '.pong');
}
