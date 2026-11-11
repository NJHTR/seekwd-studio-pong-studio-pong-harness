import { Container } from '@pong/di';

import { UnknownModuleError } from '../errors/unknown-module.error';
import { ModulesConfig } from '../modules.config';

beforeEach(() => {
	vi.resetAllMocks();
	process.env = {};
	Container.reset();
});

it('should throw `UnknownModuleError` if any enabled module name is invalid', () => {
	process.env.PONG_ENABLED_MODULES = 'insights,invalidModule';
	expect(() => Container.get(ModulesConfig)).toThrowError(UnknownModuleError);
});

it('should throw `UnknownModuleError` if any disabled module name is invalid', () => {
	process.env.PONG_DISABLED_MODULES = 'insights,invalidModule';
	expect(() => Container.get(ModulesConfig)).toThrowError(UnknownModuleError);
});
