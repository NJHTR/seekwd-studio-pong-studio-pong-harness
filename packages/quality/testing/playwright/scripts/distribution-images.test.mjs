import { SERVICE_NAMES } from 'pong-containers/services/types';
import { describe, expect, it } from 'vitest';

import { CAPABILITIES } from '../fixtures/capabilities';
import { getRequiredImages } from './distribution-images.mjs';

describe('getRequiredImages', () => {
	it.each(SERVICE_NAMES)('maps the %s service to its required images', (service) => {
		expect(() => getRequiredImages([], [service])).not.toThrow();
	});
	it.each(Object.entries(CAPABILITIES))(
		'maps the %s capability through its configured services',
		(capability, config) => {
			expect(getRequiredImages([capability], [])).toEqual(
				getRequiredImages([], config.services ?? []),
			);
		},
	);

	it('maps the tracing service to both tracing images', () => {
		expect(getRequiredImages([], ['tracing'])).toEqual(
			expect.arrayContaining(['jaeger', 'pongTracer']),
		);
	});

	it('rejects an unknown service', () => {
		expect(() => getRequiredImages([], ['unknown'])).toThrow(
			'No Docker image mapping for service "unknown"',
		);
	});
});
