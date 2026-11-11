'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { name, version } = require('../package.json');

const userFolder = process.env.PONG_USER_FOLDER ?? process.env.HOME ?? process.cwd();
const markerDir = path.join(userFolder, '.pong', 'community-package-imports');
fs.mkdirSync(markerDir, { recursive: true });
fs.writeFileSync(path.join(markerDir, `${name}@${version}`), new Date().toISOString());

class CompatProbe {
	constructor() {
		this.description = {
			displayName: `Compat Probe (${name}@${version})`,
			name: 'compatProbe',
			group: ['transform'],
			version: 1,
			description: 'Node API compatibility fixture',
			defaults: { name: 'Compat Probe' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
		};
	}

	async execute() {
		return [this.getInputData()];
	}
}

module.exports = { CompatProbe };
