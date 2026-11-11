import { Command } from '@pong/decorators';
import { Container } from '@pong/di';

import { License } from '@/license';

import { BaseCommand } from '../base-command';

@Command({
	name: 'license:clear',
	description: 'Clear local license certificate',
})
export class ClearLicenseCommand extends BaseCommand {
	async run() {
		this.logger.info('Clearing license from database.');

		// clear() releases any floating entitlements before it deletes the cert
		const license = Container.get(License);
		await license.init({ isCli: true });
		await license.clear();
		this.logger.info('Done. Restart pong to take effect.');
	}

	async catch(error: Error) {
		this.logger.error('Error. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.info('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
