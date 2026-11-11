export type PongTheme = 'light' | 'dark';

export function resolvePongTheme(theme: unknown): PongTheme {
	return theme === 'dark' ? 'dark' : 'light';
}

/** pong tokens follow `data-theme` on html/body, including `body:not([data-theme])` fallbacks. */
export function applyPongTheme(theme: unknown): void {
	const resolved = resolvePongTheme(theme);

	for (const el of [document.documentElement, document.body]) {
		if (!el) {
			continue;
		}

		el.dataset.theme = resolved;
		el.style.colorScheme = resolved;
		el.classList.remove('light', 'dark');
		el.classList.add(resolved);
	}
}
