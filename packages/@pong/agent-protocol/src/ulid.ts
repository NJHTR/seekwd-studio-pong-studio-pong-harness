import { randomBytes } from 'node:crypto';

/** ULID alphabet: Crockford base32 without I, L, O and U. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const RANDOM_BYTES = 16;

/** 48-bit timestamp ceiling. The first base32 character must stay in 0-7. */
const MAX_TIME_MS = 2 ** 48 - 1;

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const TIMESTAMP_CHAR_PATTERN = /^[0-7]$/;

function encodeTimestamp(timeMs: number): string {
	if (!Number.isInteger(timeMs) || timeMs < 0 || timeMs > MAX_TIME_MS) {
		throw new RangeError(`ULID timestamp must be an integer in [0, ${MAX_TIME_MS}], got ${timeMs}`);
	}

	let remaining = timeMs;
	let encoded = '';

	for (let index = 0; index < 10; index += 1) {
		encoded = CROCKFORD[remaining % 32] + encoded;
		remaining = Math.floor(remaining / 32);
	}

	return encoded;
}

function encodeRandomness(): string {
	// Each byte is masked with 31: 256 / 32 === 8, so the mapping stays uniform.
	const bytes = randomBytes(RANDOM_BYTES);
	let encoded = '';

	for (const byte of bytes) {
		encoded += CROCKFORD[byte & 31];
	}

	return encoded;
}

/**
 * Create a ULID. Randomness comes from the platform CSPRNG; monotonicity is NOT
 * guaranteed, so callers must not use this as an ordering key (use `log_seq`).
 */
export function createUlid(timeMs: number = Date.now()): string {
	return encodeTimestamp(timeMs) + encodeRandomness();
}

/** True when `value` is a 26-character Crockford base32 ULID with a valid timestamp. */
export function isUlid(value: string): boolean {
	if (value.length !== 26 || !ULID_PATTERN.test(value)) {
		return false;
	}

	return TIMESTAMP_CHAR_PATTERN.test(value.charAt(0));
}

/** Extract the epoch milliseconds encoded in a ULID. Throws on invalid input. */
export function ulidTimeMs(value: string): number {
	if (!isUlid(value)) {
		throw new RangeError(`Invalid ULID: ${value}`);
	}

	let timeMs = 0;

	for (const character of value.slice(0, 10)) {
		timeMs = timeMs * 32 + CROCKFORD.indexOf(character);
	}

	return timeMs;
}
