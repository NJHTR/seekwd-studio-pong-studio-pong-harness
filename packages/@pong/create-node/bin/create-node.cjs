#!/usr/bin/env node

const { spawnSync } = require('child_process');

const pongNodeBin = require.resolve('.bin/pong-node');

const result = spawnSync(pongNodeBin, ['new', ...process.argv.slice(2)], {
	stdio: 'inherit',
});

process.exit(result.status ?? 1);
