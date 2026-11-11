import { CREDENTIAL_ONLY_NODE_PREFIX } from '../src/constants';
import {
	getCredentialOnlyNodeCredentialType,
	getCredentialOnlyNodeTypeName,
	isCredentialOnlyNodeType,
} from '../src/credential-only-nodes';

describe('credential-only nodes', () => {
	it('recognises a generated node type name', () => {
		expect(isCredentialOnlyNodeType('pong-creds-base.virusTotalApi')).toBe(true);
	});

	it('does not recognise a registered node type or the bare prefix', () => {
		expect(isCredentialOnlyNodeType('pong-nodes-base.httpRequest')).toBe(false);
		expect(isCredentialOnlyNodeType(CREDENTIAL_ONLY_NODE_PREFIX)).toBe(false);
		expect(isCredentialOnlyNodeType('pong-creds-baseX.virusTotalApi')).toBe(false);
	});

	it('answers false for a node that has no type yet', () => {
		expect(isCredentialOnlyNodeType(undefined)).toBe(false);
		expect(isCredentialOnlyNodeType(null)).toBe(false);
		expect(isCredentialOnlyNodeType('')).toBe(false);
	});

	it('round-trips a credential type through the generated name', () => {
		const nodeTypeName = getCredentialOnlyNodeTypeName('virusTotalApi');

		expect(nodeTypeName).toBe('pong-creds-base.virusTotalApi');
		expect(getCredentialOnlyNodeCredentialType(nodeTypeName)).toBe('virusTotalApi');
	});
});
