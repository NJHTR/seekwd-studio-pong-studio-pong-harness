import type { ModuleLicenseFlag } from '@pong/frontend-module-sdk';
import { useSettingsStore } from '@pong/stores/settings.store';

/** An inactive module shows its placeholder page only while its license is off */
export const showsPlaceholderPage = (licenseFlag?: ModuleLicenseFlag) =>
	!!licenseFlag && !useSettingsStore().isEnterpriseFeatureEnabled[licenseFlag];
