import type { JSONValue } from '@pong/agents';
import { UnexpectedError } from '@pong/errors';

/**
 * Narrow an unknown payload to the JSON value type of the host events.
 *
 * The host-event channel measures JSON size and stores the payload with the
 * turn, so every payload must be JSON-safe. Host payloads are built from
 * protocol fields, which are JSON by construction; this check makes the
 * boundary explicit and turns a programming mistake into a clear error.
 */
export function toJsonValue(value: unknown): JSONValue {
	const json = JSON.stringify(value);
	if (json === undefined) {
		throw new UnexpectedError('A host event payload must be JSON serializable.');
	}
	const parsed: unknown = JSON.parse(json);
	if (!isJsonValue(parsed)) {
		throw new UnexpectedError('A host event payload must be JSON serializable.');
	}
	return parsed;
}

export function isJsonValue(value: unknown): value is JSONValue {
	if (value === null) return true;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return true;
	}
	if (Array.isArray(value)) return value.every(isJsonValue);
	if (typeof value === 'object') return Object.values(value).every(isJsonValue);
	return false;
}
