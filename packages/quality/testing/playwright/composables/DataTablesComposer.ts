import type { pongPage } from '../pages/pongPage';

export class DataTableComposer {
	constructor(private readonly pong: pongPage) {}

	async createNewDataTable(name: string) {
		const nameInput = this.pong.dataTable.getNewDataTableNameInput();
		await nameInput.fill(name);
		await this.pong.dataTable.getFromScratchOption().click();
		await this.pong.dataTable.getProceedFromSelectButton().click();
	}

	/**
	 * Creates project and data table inside it, navigating to project 'Data Table' tab
	 * @param projectName
	 * @param dataTableName
	 * @param source - from where the creation is initiated (empty state or header dropdown)
	 */
	async createDataTableInNewProject(
		projectName: string,
		dataTableName: string,
		source: 'empty-state' | 'header-dropdown',
		fromDataTableTab: boolean = true,
	) {
		const { projectId } = await this.pong.projectComposer.createProject(projectName);

		if (fromDataTableTab) {
			await this.pong.navigate.toDatatables(projectId);
		} else {
			await this.pong.navigate.toProject(projectId);
		}

		if (source === 'empty-state') {
			await this.pong.dataTable.clickEmptyStateButton();
		} else {
			await this.pong.dataTable.clickAddDataTableAction(fromDataTableTab);
		}
		await this.pong.dataTableComposer.createNewDataTable(dataTableName);
		await this.pong.navigate.toDatatables(projectId);
	}
}
