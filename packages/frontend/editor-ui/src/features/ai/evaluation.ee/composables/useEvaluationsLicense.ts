import { computed } from 'vue';

/** Evaluations are always available in the local build. */
export function useEvaluationsLicense() {
	return {
		isLicensed: computed(() => true),
		isResolved: computed(() => true),
		ensureLicenseLoaded: async () => {},
	};
}
