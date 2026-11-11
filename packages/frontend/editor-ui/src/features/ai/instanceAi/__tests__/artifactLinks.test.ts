import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { useArtifactLinks } from '../artifactLinks';
import { createArtifactTestRouter } from './artifactTestRouter';

function setup(base: string) {
	let links!: ReturnType<typeof useArtifactLinks>;
	mount(
		defineComponent({
			setup() {
				links = useArtifactLinks();
				return () => null;
			},
		}),
		{ global: { plugins: [createArtifactTestRouter(base)] } },
	);
	return links;
}

const BASES = [
	{ base: '/', prefix: '' },
	{ base: '/pong/', prefix: '/pong' },
];

describe('useArtifactLinks', () => {
	it.each([
		['credential', '/pong/home/credentials/res-1'],
		['data-table', '/pong/home/datatables'],
		['agent', '/pong/home/agents'],
	] as const)('resolves a %s without a project to %s', (type, href) => {
		const { artifactHref } = setup('/pong/');

		expect(artifactHref(type, 'res-1')).toBe(href);
	});

	it('has no link for an app without a project', () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const { artifactHref, artifactUrl, openArtifactInNewTab } = setup('/pong/');

		expect(artifactHref('app', 'app-1')).toBeUndefined();
		expect(artifactUrl('app', 'app-1')).toBeUndefined();
		expect(openArtifactInNewTab('app', 'app-1')).toBe(false);
		expect(open).not.toHaveBeenCalled();
	});

	it.each(BASES)(
		'keeps the history base $base in hrefs, copied URLs and new tabs',
		({ base, prefix }) => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null);
			const { artifactHref, artifactUrl, openArtifactInNewTab } = setup(base);

			expect(artifactHref('workflow', 'wf-1')).toBe(`${prefix}/workflow/wf-1`);
			expect(artifactUrl('skill', 'skill-1')).toBe(
				`${window.location.origin}${prefix}/settings/context/skills?skillId=skill-1`,
			);
			expect(openArtifactInNewTab('agent', 'agent-1', 'project-1')).toBe(true);
			expect(open).toHaveBeenCalledWith(
				`${prefix}/projects/project-1/agents/agent-1`,
				'_blank',
				'noopener',
			);
		},
	);
});

describe('toRouterPath and routerPathHref', () => {
	it.each(BASES)(
		'read links with or without the history base $base and add the base once',
		({ base, prefix }) => {
			const { toRouterPath, routerPathHref } = setup(base);
			const pathname = '/workflow/wf-1';
			const fullPath = `${pathname}?a=b%20c&d=e+f#node`;

			for (const href of [
				fullPath,
				`${prefix}${fullPath}`,
				`${window.location.origin}${prefix}${fullPath}`,
			]) {
				expect(toRouterPath(href)).toEqual({ pathname, fullPath });
				expect(routerPathHref(fullPath)).toBe(`${prefix}${fullPath}`);
			}
		},
	);

	it('removes only a whole-segment base', () => {
		const { toRouterPath } = setup('/pong/');

		expect(toRouterPath('/pong/workflow/wf-1')?.pathname).toBe('/workflow/wf-1');
		expect(toRouterPath('/pong')?.pathname).toBe('/');
		expect(toRouterPath('/pongx/workflow/wf-1')?.pathname).toBe('/pongx/workflow/wf-1');
	});
});
