import { describe } from 'vitest';

import { NoPageInFlowRule } from './no-page-in-flow.rule.js';
import { test, expect } from '../test/fixtures.js';

describe('NoPageInFlowRule', () => {
	const rule = new NoPageInFlowRule();

	test('allows page object usage', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private pong: any) {}

	async createWorkflow() {
		await this.pong.canvas.openNewWorkflow();
		await this.pong.ndv.setName('Test');
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(0);
	});

	test('detects direct page.getByTestId access', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private pong: any) {}

	async clickButton() {
		await this.pong.page.getByTestId('button').click();
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].message).toContain('page.getByTestId');
	});

	test('detects page.locator access', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private pong: any) {}

	async findElement() {
		return this.pong.page.locator('.my-class');
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
	});

	test('detects page.goto access', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private pong: any) {}

	async navigate() {
		await this.pong.page.goto('/workflows');
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toContain('navigation');
	});

	test('detects multiple direct page accesses', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private pong: any) {}

	async doStuff() {
		await this.pong.page.getByTestId('a').click();
		await this.pong.page.locator('.b').fill('text');
		await this.pong.page.getByRole('button').click();
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(3);
	});

	test('reports correct line numbers', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`export class WorkflowComposer {
	constructor(private pong: any) {}

	async method() {
		// line 5
		await this.pong.page.getByTestId('x').click(); // line 6
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].line).toBe(6);
	});

	test('provides context-specific suggestions', ({ project, createFile }) => {
		const file = createFile(
			'/composables/WorkflowComposer.ts',
			`
export class WorkflowComposer {
	constructor(private pong: any) {}

	async method() {
		await this.pong.page.getByTestId('x').click();
	}
}
`,
		);

		const violations = rule.analyzeProject(project, [file]);

		expect(violations).toHaveLength(1);
		expect(violations[0].suggestion).toBeDefined();
		expect(violations[0].suggestion).toContain('page object');
	});
});
