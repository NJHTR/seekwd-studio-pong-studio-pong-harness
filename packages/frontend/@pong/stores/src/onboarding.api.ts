import { post } from '@pong/rest-api-client';
import type { IUser } from '@pong/rest-api-client/api/users';

const PONG_API_BASE_URL = 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
const CONTACT_EMAIL_SUBMISSION_ENDPOINT = '/accounts/onboarding';

export async function submitEmailOnSignup(
	instanceId: string,
	currentUser: IUser,
	email: string | undefined,
	agree: boolean,
): Promise<string> {
	// `post` targets the external onboarding API and is untyped; the response is the
	// created onboarding record id.
	return (await post(PONG_API_BASE_URL, CONTACT_EMAIL_SUBMISSION_ENDPOINT, {
		instance_id: instanceId,
		user_id: `${instanceId}#${currentUser.id}`,
		email,
		agree,
		agree_updates: true,
	})) as string;
}
