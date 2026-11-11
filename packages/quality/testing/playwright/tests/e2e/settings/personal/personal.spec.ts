import { test, expect } from '../../../../fixtures/base';

const INVALID_NAMES = [
	'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	'www.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
	'pong.бг',
	'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/home',
	'github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/home?send=true',
	'<a href="#">Jack</a>',
	'<script>alert("Hello")</script>',
];

const VALID_NAMES = [
	['a', 'a'],
	['alice', 'alice'],
	['Robert', 'Downey Jr.'],
	['Mia', 'Mia-Downey'],
	['Mark', "O'neil"],
	['Thomas', 'Müler'],
	['ßáçøñ', 'ßáçøñ'],
	['أحمد', 'فلسطين'],
	['Милорад', 'Филиповић'],
];

test.describe(
	'Personal Settings',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should allow to change first and last name', async ({ pong }) => {
			await pong.settingsPersonal.goto();

			// Each field saves on its own. The confirmation closes itself and has no close button,
			// so check each save's response and the confirmation once at the end.
			for (const [firstName, lastName] of VALID_NAMES) {
				expect((await pong.settingsPersonal.saveFirstName(firstName)).ok()).toBe(true);
				expect((await pong.settingsPersonal.saveLastName(lastName)).ok()).toBe(true);
			}
			await pong.notifications.waitForNotification('Personal details updated');
		});

		test('should not allow malicious values for personal data', async ({ pong }) => {
			await pong.settingsPersonal.goto();

			for (const name of INVALID_NAMES) {
				expect((await pong.settingsPersonal.saveFirstName(name)).ok()).toBe(false);
				await pong.notifications.waitForNotificationAndClose('Problem updating your details');

				expect((await pong.settingsPersonal.saveLastName(name)).ok()).toBe(false);
				await pong.notifications.waitForNotificationAndClose('Problem updating your details');
			}
		});
	},
);
