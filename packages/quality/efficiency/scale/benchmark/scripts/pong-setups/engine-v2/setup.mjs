#!/usr/bin/env zx

import path from 'path';
import { fs } from 'zx';

/**
 * Creates the needed directories so the permissions get set correctly.
 */
export function setup({ runDir }) {
	const neededDirs = ['pong-engine1', 'pong-engine2', 'pong-main', 'postgres', 'storage'];

	for (const dir of neededDirs) {
		fs.ensureDirSync(path.join(runDir, dir));
	}
}
