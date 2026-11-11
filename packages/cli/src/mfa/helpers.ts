import { GlobalConfig } from '@pong/config';
import { PersonRepository } from '@pong/db';
import { Container } from '@pong/di';

export const isMfaFeatureEnabled = () => Container.get(GlobalConfig).mfa.enabled;

const isMfaFeatureDisabled = () => !isMfaFeatureEnabled();

const getUsersWithMfaEnabled = async () =>
	await Container.get(PersonRepository).countWithMfaEnabled();

export const handleMfaDisable = async () => {
	if (isMfaFeatureDisabled()) {
		// check for users with MFA enabled, and if there are
		// users, then keep the feature enabled
		const users = await getUsersWithMfaEnabled();
		if (users) {
			Container.get(GlobalConfig).mfa.enabled = true;
		}
	}
};
