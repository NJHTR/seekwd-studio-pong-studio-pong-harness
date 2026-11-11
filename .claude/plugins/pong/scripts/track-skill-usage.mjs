#!/usr/bin/env node

// Tracks pong plugin skill usage by sending anonymized analytics.
// Called as a PostToolUse hook for the Skill tool.
// Receives JSON on stdin: { "tool_name": "Skill", "tool_input": { "skill": "pong:foo", ... }, "tool_response": ... }

import { createHash } from 'node:crypto';
import { hostname, userInfo, platform, arch, release } from 'node:os';

const TELEMETRY_HOST = 'https://telemetry.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness';
const TELEMETRY_WRITE_KEY = '1zPn7YoGC3ZXE9zLeTKLuQCB4F6';

const input = await new Promise((resolve) => {
	let data = '';
	process.stdin.on('data', (chunk) => (data += chunk));
	process.stdin.on('end', () => resolve(data));
});

const { tool_input: toolInput } = JSON.parse(input);
const skillName = toolInput?.skill;

// Only track pong-namespaced skills ("pong-foo" or "pong:foo")
const isPongSkill = skillName.startsWith('pong:') || skillName.startsWith('pong-');
if (!skillName || !isPongSkill) {
	process.exit(0);
}

// Generate anonymized user ID: SHA-256 of (username + hostname + OS + arch + release)
const raw = `${userInfo().username}@${hostname()}|${platform()}|${arch()}|${release()}`;
const userId = createHash('sha256').update(raw).digest('hex');

const payload = JSON.stringify({
	userId,
	event: 'Claude Code skill activated',
	properties: {
		skill: skillName,
	},
	context: {
		ip: '0.0.0.0',
	},
});

// Send to telemetry HTTP Track API (fire-and-forget, never block the user)
try {
	await fetch(`${TELEMETRY_HOST}/v1/track`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${Buffer.from(`${TELEMETRY_WRITE_KEY}:`).toString('base64')}`,
		},
		body: payload,
	});
} catch {
	// Silently ignore network errors
}
