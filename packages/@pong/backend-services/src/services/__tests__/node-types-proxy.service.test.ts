import { UnexpectedError } from '@pong/errors';
import type { INodeType, INodeTypes } from 'pong-workflow';
import { mock } from 'vitest-mock-extended';

import { NodeTypesProviderMissingError, NodeTypesProxy } from '../node-types-proxy.service';

describe('NodeTypesProxy', () => {
	it('throws when no provider is registered', () => {
		const proxy = new NodeTypesProxy();

		expect(() => proxy.getByName('pong-nodes-base.set')).toThrow(UnexpectedError);
		expect(() => proxy.getByNameAndVersion('pong-nodes-base.set', 1)).toThrow(UnexpectedError);
		expect(() => proxy.getKnownTypes()).toThrow(UnexpectedError);
		expect(() => proxy.getByName('pong-nodes-base.set')).toThrow(NodeTypesProviderMissingError);
	});

	it('delegates getByName to the registered provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const nodeType = mock<INodeType>();
		provider.getByName.mockReturnValue(nodeType);
		proxy.registerProvider(provider);

		expect(proxy.getByName('pong-nodes-base.set')).toBe(nodeType);
		expect(provider.getByName).toHaveBeenCalledWith('pong-nodes-base.set');
	});

	it('delegates getByNameAndVersion to the registered provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const nodeType = mock<INodeType>();
		provider.getByNameAndVersion.mockReturnValue(nodeType);
		proxy.registerProvider(provider);

		expect(proxy.getByNameAndVersion('pong-nodes-base.set', 3)).toBe(nodeType);
		expect(provider.getByNameAndVersion).toHaveBeenCalledWith('pong-nodes-base.set', 3);
	});

	it('delegates getKnownTypes to the registered provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const knownTypes = { 'pong-nodes-base.set': { className: 'Set', sourcePath: '' } };
		provider.getKnownTypes.mockReturnValue(knownTypes);
		proxy.registerProvider(provider);

		expect(proxy.getKnownTypes()).toBe(knownTypes);
	});

	it('propagates errors from the provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const error = new Error('Unrecognized node type');
		provider.getByNameAndVersion.mockImplementation(() => {
			throw error;
		});
		proxy.registerProvider(provider);

		expect(() => proxy.getByNameAndVersion('pong-nodes-base.unknown')).toThrow(error);
	});
});
