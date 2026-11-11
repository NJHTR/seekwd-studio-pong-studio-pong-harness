#!/usr/bin/env node
/**
 * Extracts manifest digests and image names for SLSA provenance and VEX attestation.
 *
 * Usage:
 *   PONG_TAG=ghcr.io/pong-io/pong:1.0.0 node get-manifest-digests.mjs
 *
 * Environment variables:
 *   PONG_TAG              - Full image reference for pong image
 *   PONG_PC_TAG           - Full image reference for the pointer-compressed pong image
 *   PONG_DEBIAN_TAG       - Full image reference for the Debian (glibc) pong image
 *   RUNNERS_TAG          - Full image reference for runners image
 *   DISTROLESS_TAG       - Full image reference for runners-distroless image
 *   RUNNERS_DEBIAN_TAG   - Full image reference for the Debian (glibc) runners image
 *   GITHUB_OUTPUT        - Path to GitHub Actions output file (optional)
 */

import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const githubOutput = process.env.GITHUB_OUTPUT || null;

function getDigest(imageRef) {
	if (!imageRef) return '';
	const raw = execSync(`docker buildx imagetools inspect "${imageRef}" --raw`, {
		encoding: 'utf8',
	});
	const hash = execSync('sha256sum', { input: raw, encoding: 'utf8' }).split(' ')[0].trim();
	return `sha256:${hash}`;
}

function getImageName(imageRef) {
	if (!imageRef) return '';
	return imageRef.replace(/:([^:]+)$/, '');
}

function setOutput(name, value) {
	if (githubOutput && value) appendFileSync(githubOutput, `${name}=${value}\n`);
}

const pongTag = process.env.PONG_TAG || '';
const pongPcTag = process.env.PONG_PC_TAG || '';
const pongDebianTag = process.env.PONG_DEBIAN_TAG || '';
const runnersTag = process.env.RUNNERS_TAG || '';
const distrolessTag = process.env.DISTROLESS_TAG || '';
const runnersDebianTag = process.env.RUNNERS_DEBIAN_TAG || '';

const results = {
	pong: { digest: getDigest(pongTag), image: getImageName(pongTag) },
	pong_pc: { digest: getDigest(pongPcTag), image: getImageName(pongPcTag) },
	pong_debian: { digest: getDigest(pongDebianTag), image: getImageName(pongDebianTag) },
	runners: { digest: getDigest(runnersTag), image: getImageName(runnersTag) },
	runners_distroless: { digest: getDigest(distrolessTag), image: getImageName(distrolessTag) },
	runners_debian: { digest: getDigest(runnersDebianTag), image: getImageName(runnersDebianTag) },
};

setOutput('pong_digest', results.pong.digest);
setOutput('pong_image', results.pong.image);
setOutput('pong_pc_digest', results.pong_pc.digest);
setOutput('pong_pc_image', results.pong_pc.image);
setOutput('pong_debian_digest', results.pong_debian.digest);
setOutput('pong_debian_image', results.pong_debian.image);
setOutput('runners_digest', results.runners.digest);
setOutput('runners_image', results.runners.image);
setOutput('runners_distroless_digest', results.runners_distroless.digest);
setOutput('runners_distroless_image', results.runners_distroless.image);
setOutput('runners_debian_digest', results.runners_debian.digest);
setOutput('runners_debian_image', results.runners_debian.image);

console.log('=== Manifest Digests ===');
console.log(`pong: ${results.pong.digest || 'N/A'}`);
console.log(`pong-pc: ${results.pong_pc.digest || 'N/A'}`);
console.log(`pong-debian: ${results.pong_debian.digest || 'N/A'}`);
console.log(`runners: ${results.runners.digest || 'N/A'}`);
console.log(`runners-distroless: ${results.runners_distroless.digest || 'N/A'}`);
console.log(`runners-debian: ${results.runners_debian.digest || 'N/A'}`);
console.log('');
console.log('=== Image Names ===');
console.log(`pong: ${results.pong.image || 'N/A'}`);
console.log(`pong-pc: ${results.pong_pc.image || 'N/A'}`);
console.log(`pong-debian: ${results.pong_debian.image || 'N/A'}`);
console.log(`runners: ${results.runners.image || 'N/A'}`);
console.log(`runners-distroless: ${results.runners_distroless.image || 'N/A'}`);
console.log(`runners-debian: ${results.runners_debian.image || 'N/A'}`);
