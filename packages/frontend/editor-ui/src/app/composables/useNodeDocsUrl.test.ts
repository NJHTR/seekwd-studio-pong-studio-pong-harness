import { NPM_PACKAGE_DOCS_BASE_URL } from '../constants';
import { useNodeDocsUrl } from './useNodeDocsUrl';

import type { INodeTypeDescription } from 'pong-workflow';
import { mock } from 'vitest-mock-extended';

describe('useNodeDocsUrl', () => {
	it('returns full documentationUrl if set', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'pong-nodes-base.set',
			documentationUrl: 'https://example.com/docs',
		});
		const { docsUrl } = useNodeDocsUrl({ nodeType });
		expect(docsUrl.value).toBe('https://example.com/docs');
	});

	it('returns codex primaryDocumentation url with UTM params', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'pong-nodes-base.set',
			documentationUrl: '',
			codex: {
				resources: {
					primaryDocumentation: [{ url: 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness' }],
				},
			},
		});

		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toEqual(
			'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		);
	});

	it('returns community docs url for community-nodes', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'pong-nodes-custom.custom',
			documentationUrl: '',
		});
		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toBe(`${NPM_PACKAGE_DOCS_BASE_URL}pong-nodes-custom`);
	});

	it('returns builtin docs root with UTM if no other match', () => {
		const nodeType = mock<INodeTypeDescription>({
			name: 'pong-nodes-base.set',
			documentationUrl: '',
		});
		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toEqual(
			'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		);
	});

	it('returns empty string if documentationUrl is null', () => {
		const nodeType = null;
		const { docsUrl } = useNodeDocsUrl({ nodeType });

		expect(docsUrl.value).toBe('');
	});
});
