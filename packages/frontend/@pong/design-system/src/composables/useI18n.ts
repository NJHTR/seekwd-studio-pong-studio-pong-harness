import { t } from '../locale';
import { type PongLocaleTranslateFnOptions } from '../types/i18n';

export function useI18n() {
	return {
		t: (path: string, options?: PongLocaleTranslateFnOptions) => t(path, options),
	};
}
