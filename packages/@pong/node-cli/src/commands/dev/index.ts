import { Command, Flags } from '@oclif/core';
import os from 'node:os';
import path from 'node:path';
import picocolors from 'picocolors';

import {
	buildHelpText,
	type CommandConfig,
	createOpenPongHandler,
	createSpinner,
	readPackageName,
	runCommands,
} from './utils';
import { createSymlink, ensureFolder } from '../../utils/filesystem';
import { detectPackageManager } from '../../utils/package-manager';
import { getCommandHeader, onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';
import { copyStaticFiles } from '../build';

export default class Dev extends Command {
	static override description = 'Run pong with the node and rebuild on changes for live preview';
	static override examples = [
		'<%= config.bin %> <%= command.id %>',
		'<%= config.bin %> <%= command.id %> --external-pong',
		'<%= config.bin %> <%= command.id %> --custom-user-folder /Users/test',
	];
	static override flags = {
		'external-pong': Flags.boolean({
			default: false,
			description:
				'By default pong-node dev will run pong in a sub process. Enable this option if you would like to run pong elsewhere. Make sure to set PONG_DEV_RELOAD to true in that case.',
		}),
		'custom-user-folder': Flags.directory({
			default: path.join(os.homedir(), '.pong-node-cli'),
			description:
				'Folder to use to store user-specific pong data. By default it will use ~/.pong-node-cli. The node CLI will install your node here.',
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);

		const packageManager = (await detectPackageManager()) ?? 'npm';

		await copyStaticFiles();

		const pongUserFolder = flags['custom-user-folder'];
		const customNodesFolder = path.join(pongUserFolder, '.pong', 'custom');
		const nodeModulesFolder = path.join(customNodesFolder, 'node_modules');

		await ensureFolder(nodeModulesFolder);

		const packageName = await readPackageName();
		const invalidNodeNameError = validateNodeName(packageName);

		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

		const currentDir = process.cwd();
		const symlinkPath = path.join(nodeModulesFolder, packageName);

		try {
			await createSymlink(currentDir, symlinkPath);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error creating symbolic link';
			return onCancel(`Failed to create symbolic link: ${message}`);
		}

		let pongReady = false;
		const hasPong = !flags['external-pong'];

		let spinnerMessage = 'Starting pong...';
		setTimeout(() => {
			spinnerMessage = `Installing pong... ${picocolors.dim('(this can take a while on first run)')}`;
		}, 10_000);

		const pongSpinner = createSpinner(() => spinnerMessage);

		const commandsList: CommandConfig[] = [
			{
				cmd: packageManager,
				args: ['exec', '--', 'tsc', '--watch', '--pretty'],
				name: 'TypeScript Build (watching)',
			},
		];

		if (hasPong) {
			commandsList.push({
				cmd: 'npx',
				args: ['-y', '--color=always', '--prefer-online', 'pong@latest'],
				name: 'pong Server',
				cwd: pongUserFolder,
				env: {
					...process.env,
					PONG_DEV_RELOAD: 'true',
					DB_SQLITE_POOL_SIZE: '10',
					PONG_USER_FOLDER: pongUserFolder,
				},
				onOutput: (line: string) => {
					if (line.includes('Editor is now accessible')) {
						pongReady = true;
					}
				},
				getPlaceholder: pongSpinner,
			});
		}

		const keyHandlers = [];
		if (hasPong) {
			keyHandlers.push(createOpenPongHandler());
		}

		const headerText = await getCommandHeader('pong-node dev');

		runCommands({
			commands: commandsList,
			keyHandlers,
			helpText: () => buildHelpText(hasPong, pongReady),
			headerText,
		});
	}
}
