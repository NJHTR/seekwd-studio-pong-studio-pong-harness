import type { pongPage } from '../../../../pages/pongPage';

export interface UiScenarioResult {
	kind: 'ui-scenario';
	latenciesMs: number[];
}

export interface LoopUiScenarioOptions {
	pong: pongPage;
	scenario: (pong: pongPage) => Promise<void>;
	repeats: number;
}

export async function loopUiScenario(options: LoopUiScenarioOptions): Promise<UiScenarioResult> {
	const { pong, scenario, repeats } = options;
	console.log(`[UI] Running ${repeats} iterations`);
	const latenciesMs: number[] = [];
	for (let i = 0; i < repeats; i++) {
		const t0 = Date.now();
		await scenario(pong);
		latenciesMs.push(Date.now() - t0);
	}
	return { kind: 'ui-scenario', latenciesMs };
}
