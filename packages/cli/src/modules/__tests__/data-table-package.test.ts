import { ModuleRegistry, ModulesConfig } from '@pong/backend-common';
import { DataTable, DataTableColumn } from '@pong/backend-module-data-table';
import { ControllerRegistryMetadata, ModuleMetadata } from '@pong/decorators';
import { Container } from '@pong/di';

import { packagedModules } from '../modules.manifest';

describe('packaged data tables', () => {
	it('excludes the module when disabled', () => {
		const config = Container.get(ModulesConfig);
		const disabledModules = config.disabledModules;
		config.disabledModules = ['data-table'];

		try {
			expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('data-table');
		} finally {
			config.disabledModules = disabledModules;
		}
	});

	it('loads entities through the manifest without registering routes', async () => {
		const metadata = Container.get(ModuleMetadata);
		const controllers = Container.get(ControllerRegistryMetadata);
		expect(metadata.get('data-table')).toBeUndefined();
		expect([...controllers.controllerClasses]).toEqual([]);

		await packagedModules['data-table']?.();

		const entry = metadata.get('data-table');
		expect(entry).toBeDefined();
		expect([...controllers.controllerClasses]).toEqual([]);
		const module = entry && Container.get(entry.class);
		expect(await module?.entities?.()).toEqual([DataTable, DataTableColumn]);
	});
});
