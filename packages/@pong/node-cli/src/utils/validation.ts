export const validateNodeName = (name: string): string | undefined => {
	if (!name) return;

	// 1. Matches '@org/pong-nodes-anything'
	const regexScoped = /^@([a-z0-9]+(?:[-.][a-z0-9]+)*)\/pong-nodes-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
	// 2. Matches 'pong-nodes-anything'
	const regexUnscoped = /^pong-nodes-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

	if (!regexScoped.test(name) && !regexUnscoped.test(name)) {
		return "Must start with 'pong-nodes-' or '@org/pong-nodes-'. Examples: pong-nodes-my-app, @mycompany/pong-nodes-my-app";
	}
	return;
};

export function isNodeErrnoException(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error;
}

export function isEnoentError(error: unknown): boolean {
	return isNodeErrnoException(error) && error.code === 'ENOENT';
}
