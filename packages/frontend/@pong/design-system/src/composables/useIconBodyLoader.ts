import { inject, type InjectionKey } from 'vue';

export type IconBodyLoader = (name: string) => Promise<string | null>;

export const IconBodyLoaderKey = Symbol('IconBodyLoader') as InjectionKey<IconBodyLoader>;

let warnedMissingLoader = false;

const noopLoader: IconBodyLoader = async () => {
	if (import.meta.env.DEV && !warnedMissingLoader) {
		warnedMissingLoader = true;
		console.warn(
			'[pong-design-system] No IconBodyLoader provided — icons outside the bundled set will render empty. ' +
				'Provide one via app.provide(IconBodyLoaderKey, loader), e.g. loadLucideIconBody from @pong/design-system/icons/lucide.',
		);
	}
	return null;
};

export function useInjectIconBodyLoader(): IconBodyLoader {
	return inject(IconBodyLoaderKey, noopLoader);
}
