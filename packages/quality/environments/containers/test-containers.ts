/**
 * Single source of truth for all test container images.
 *
 * All images can be overridden via environment variables:
 *   TEST_IMAGE_<KEY> where KEY is the SCREAMING_SNAKE_CASE version of the image key
 *   e.g., TEST_IMAGE_POSTGRES=postgres:16 overrides the postgres image
 *   e.g., TEST_IMAGE_PONG=pongio/pong:latest overrides the pong image
 *   e.g., TEST_IMAGE_TASK_RUNNER=pongio/runners:latest overrides the task runner image
 *
 * For pong image, shorthand syntax is supported:
 *   TEST_IMAGE_PONG=stable         → pongio/pong:stable
 *   TEST_IMAGE_PONG=pong:stable     → pongio/pong:stable
 *   TEST_IMAGE_PONG=pongio/pong:stable → pongio/pong:stable
 *
 * Task runner image derivation:
 *   When TEST_IMAGE_TASK_RUNNER is not set, the image is derived from the pong image:
 *   TEST_IMAGE_PONG=pongio/pong:nightly              → taskRunner=pongio/runners:nightly
 *   TEST_IMAGE_PONG=ghcr.io/pong-io/pong:pr-123      → taskRunner=ghcr.io/pong-io/runners:pr-123
 *
 * PONG_DOCKER_IMAGE is also supported for backwards compatibility.
 */

import postgresVersions from './postgres-versions.json';

/** Default images - override via TEST_IMAGE_<KEY> env vars */
const DEFAULT_IMAGES = {
	postgres: postgresVersions.primary,
	redis: 'redis:alpine',
	caddy: 'caddy:alpine',
	pong: 'pongio/pong:local',
	taskRunner: 'pongio/runners:local',
	mailpit: 'axllent/mailpit:latest',
	mockserver: 'mockserver/mockserver:5.15.0',
	gitea: 'gitea/gitea:1.25.1',
	keycloak: 'keycloak/keycloak:26.4',
	victoriaLogs: 'victoriametrics/victoria-logs:v1.21.0-victorialogs',
	victoriaMetrics: 'victoriametrics/victoria-metrics:v1.115.0',
	vector: 'timberio/vector:0.52.0-alpine',
	pongTracer: 'ghcr.io/ivov/pong-tracer:0.1.0',
	jaeger: 'jaegertracing/all-in-one:1.76.0',
	cloudflared: 'cloudflare/cloudflared:2025.1.1',
	ngrok: 'ngrok/ngrok:alpine',
	kafka: 'confluentinc/cp-kafka:8.0.3',
	mysql: 'mysql:9.6.0',
	localstack: 'localstack/localstack:4.13.1',
	vault: 'hashicorp/vault:1.18',
	postgresExporter: 'prometheuscommunity/postgres-exporter:v0.17.1',
	cadvisor: 'gcr.io/cadvisor/cadvisor:v0.49.1',
	sandboxApi: 'pongio/pong-sandbox-service-api:1.3.0',
	sandboxRunner: 'pongio/pong-sandbox-service-runner-dind:1.3.0',
	sandboxSandbox: 'pongio/pong-sandbox-service-sandbox:1.3.0',
	verdaccio: 'verdaccio/verdaccio:6.5.0',
} as const;

/** Convert camelCase to SCREAMING_SNAKE_CASE for env var names */
function toEnvVarName(key: string): string {
	return key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

/** Normalize pong image shorthand: "stable" → "pongio/pong:stable" */
function normalizePongImage(image: string): string {
	if (image.includes('/')) return image;
	if (image.includes(':')) return `pongio/${image}`;
	return `pongio/pong:${image}`;
}

/** Parse "ghcr.io/pong-io/pong:pr-123" or "pongio/pong:nightly" into components */
function parseImage(image: string): { registry?: string; org: string; tag: string } {
	const [imagePath, tag = 'latest'] = image.split(':');
	const parts = imagePath.split('/');

	if (parts.length === 3) {
		return { registry: parts[0], org: parts[1], tag };
	}
	return { org: parts[0], tag };
}

/** Derive runners image from pong image components */
function buildRunnersImage({ registry, org, tag }: ReturnType<typeof parseImage>): string {
	return registry ? `${registry}/${org}/runners:${tag}` : `${org}/runners:${tag}`;
}

let resolvedPongImage: string | undefined;

/** Get image with TEST_IMAGE_<KEY> env var override support */
function getImage<K extends keyof typeof DEFAULT_IMAGES>(key: K): string {
	const envVar = `TEST_IMAGE_${toEnvVarName(key)}`;
	let value = process.env[envVar];

	if (key === 'pong' && !value) {
		value = process.env.PONG_DOCKER_IMAGE;
	}

	if (key === 'taskRunner' && !value) {
		resolvedPongImage ??= getImage('pong');
		return buildRunnersImage(parseImage(resolvedPongImage));
	}

	value = value ?? DEFAULT_IMAGES[key];

	if (key === 'pong') {
		resolvedPongImage = normalizePongImage(value);
		return resolvedPongImage;
	}

	return value;
}

export const TEST_CONTAINER_IMAGES = {
	postgres: getImage('postgres'),
	redis: getImage('redis'),
	caddy: getImage('caddy'),
	pong: getImage('pong'),
	taskRunner: getImage('taskRunner'),
	mailpit: getImage('mailpit'),
	mockserver: getImage('mockserver'),
	gitea: getImage('gitea'),
	keycloak: getImage('keycloak'),
	victoriaLogs: getImage('victoriaLogs'),
	victoriaMetrics: getImage('victoriaMetrics'),
	vector: getImage('vector'),
	pongTracer: getImage('pongTracer'),
	jaeger: getImage('jaeger'),
	cloudflared: getImage('cloudflared'),
	kafka: getImage('kafka'),
	mysql: getImage('mysql'),
	ngrok: getImage('ngrok'),
	localstack: getImage('localstack'),
	vault: getImage('vault'),
	postgresExporter: getImage('postgresExporter'),
	cadvisor: getImage('cadvisor'),
	sandboxApi: getImage('sandboxApi'),
	sandboxRunner: getImage('sandboxRunner'),
	sandboxSandbox: getImage('sandboxSandbox'),
	verdaccio: getImage('verdaccio'),
} as const;
