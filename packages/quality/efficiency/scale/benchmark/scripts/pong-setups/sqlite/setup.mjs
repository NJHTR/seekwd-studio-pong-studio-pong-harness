#!/usr/bin/env zx

import path from 'path';
import { fs } from 'zx';

/**
 * Creates the needed directories so the permissions get set correctly.
 */
export function setup({ runDir }) {
	const neededDirs = ['pong'];

	for (const dir of neededDirs) {
		fs.ensureDirSync(path.join(runDir, dir));
	}
}
