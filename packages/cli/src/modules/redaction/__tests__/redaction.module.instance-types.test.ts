import type { LicenseState, ModulesConfig } from '@pong/backend-common';
import { Logger, ModuleRegistry } from '@pong/backend-common';
import { mockInstance } from '@pong/backend-test-utils';
import { INSTANCE_TYPES } from '@pong/constants';
import type { SystemTaskMetadata } from '@pong/decorators';
import { ModuleMetadata } from '@pong/decorators';
import { Container } from '@pong/di';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ExecutionRedactionServiceProxy } from '@pong/backend-services';

import { ExecutionRedactionService } from '../executions/execution-redaction.service';
// For the @BackendModule side effect.
import '../redaction.module';

// The decorator registers at import time, before any test can reset the container.
const moduleEntry = Container.get(ModuleMetadata).get('redaction');

/** Every instance type that can run a workflow must initialize the module. */
describe('RedactionModule instance-type eligibility', () => {
	let executionRedactionService: Mocked<ExecutionRedactionService>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockInstance(Logger);
		executionRedactionService = mock<ExecutionRedactionService>();
		executionRedactionService.init.mockResolvedValue(undefined);
		Container.set(ExecutionRedactionService, executionRedactionService);
		Container.set(ExecutionRedactionServiceProxy, mock<ExecutionRedactionServiceProxy>());
	});

	/** A registry holding only the redaction module, as the decorator registered it. */
	const buildRegistry = () => {
		const moduleMetadata = new ModuleMetadata();
		moduleMetadata.register('redaction', moduleEntry!);

		return new ModuleRegistry(
			moduleMetadata,
			mock<LicenseState>(),
			mock<Logger>(),
			mock<ModulesConfig>(),
			mock<SystemTaskMetadata>(),
		);
	};

	it('declares no instance-type restriction', () => {
		expect(moduleEntry).toBeDefined();
		expect(moduleEntry?.instanceTypes).toBeUndefined();
	});

	it.each(INSTANCE_TYPES)('initializes on a "%s" instance', async (instanceType) => {
		await buildRegistry().initModules(instanceType);

		expect(executionRedactionService.init).toHaveBeenCalledTimes(1);
	});
});
