import { auditOperations } from '../AuditDescription';
import { Pong } from '../Pong.node';
import { projectOperations } from '../ProjectDescription';
import { userOperations } from '../UserDescription';

function collectUrls(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(collectUrls);
	if (value === null || typeof value !== 'object') return [];

	return Object.entries(value).flatMap(([key, child]) => {
		if (key === 'url' && typeof child === 'string') return [child];
		return collectUrls(child);
	});
}

describe('pong Node Structure', () => {
	it.each([
		['audit', auditOperations],
		['project', projectOperations],
		['user', userOperations],
	])('%s operation default should be one of its options', (_resource, operations) => {
		const operation = operations[0];
		const values = (operation.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation.default);
	});

	it('encodes every dynamic request URL path segment', () => {
		const dynamicUrls = collectUrls(new Pong().description.properties).filter(
			(url) => url.includes('$value') || url.includes('$parameter'),
		);

		expect(dynamicUrls.length).toBeGreaterThan(0);
		for (const url of dynamicUrls) {
			const dynamicExpressions = [...url.matchAll(/{{\s*(.*?)\s*}}/g)]
				.map((match) => match[1])
				.filter((expression) => expression.includes('$value') || expression.includes('$parameter'));

			expect(url.replace(/{{\s*(.*?)\s*}}/g, '')).not.toMatch(/\$(?:value|parameter)/);
			expect(dynamicExpressions.length).toBeGreaterThan(0);
			for (const expression of dynamicExpressions) {
				expect(expression).toMatch(/^toPathSegment\(.+\)$/);
			}
		}
	});
});
