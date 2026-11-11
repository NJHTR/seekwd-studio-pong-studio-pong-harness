import { PONG_CLIENT_EDITOR_UI, PONG_CLIENT_HEADER } from '@pong/api-types';
import { createPinia, setActivePinia } from 'pinia';

import { useRootStore } from './useRootStore';

describe('useRootStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('sends the editor UI client header with the public API context', () => {
		const store = useRootStore();

		expect(store.publicApiContext.headers).toEqual({
			[PONG_CLIENT_HEADER]: PONG_CLIENT_EDITOR_UI,
		});
	});

	it('does not send the client header with the REST API context', () => {
		const store = useRootStore();

		expect(store.restApiContext).not.toHaveProperty('headers');
	});
});
