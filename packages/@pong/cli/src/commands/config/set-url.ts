import { Args, Command } from '@oclif/core';

import { readConfig, writeConfig } from '../../config';

export default class ConfigSetUrl extends Command {
	static override description = 'Set the pong instance URL';

	static override examples = [
		'<%= config.bin %> config set-url https://my-pong.app.pong.cloud',
		'<%= config.bin %> config set-url http://localhost:5678',
	];

	static override args = {
		url: Args.string({ description: 'pong instance URL', required: true }),
	};

	async run(): Promise<void> {
		const { args } = await this.parse(ConfigSetUrl);
		const config = readConfig();
		config.url = args.url;
		writeConfig(config);
		this.log(`URL set to ${args.url}`);
	}
}
