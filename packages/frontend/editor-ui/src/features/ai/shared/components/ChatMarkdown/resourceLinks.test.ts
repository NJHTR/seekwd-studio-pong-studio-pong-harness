import { describe, expect, it } from 'vitest';
import { getResourceLinkIcon } from './ChatResourceLink.utils';

describe('getResourceLinkIcon', () => {
	it.each([
		['https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', 'workflow'],
		['https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', 'workflow'],
		['https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', 'bot'],
		['https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness', 'message-circle'],
	])('matches resource links on the site: %s', (href, icon) => {
		expect(getResourceLinkIcon(href, 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness')).toBe(icon);
	});

	it.each([
		'https://www.google.com/workflow',
		'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness',
		'ftp://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness/workflow/123',
		'javascript:alert(1)',
	])('leaves other links unchanged: %s', (href) => {
		expect(getResourceLinkIcon(href, 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness')).toBeUndefined();
	});

	it.each([
		['/workflow/123?tab=editor#node', 'workflow'],
		['/project/123/workflow/456', 'workflow'],
		['/agents/abc', 'bot'],
		['/assistant/890', 'message-circle'],
	])('matches relative resource links: %s', (href, icon) => {
		expect(getResourceLinkIcon(href, 'https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness')).toBe(icon);
	});

	it('matches the local backend when the editor uses a different port', () => {
		expect(
			getResourceLinkIcon(
				'http://localhost:5678/workflow/JNtOPQ1lpCVznf9F',
				'http://localhost:8080',
			),
		).toBe('workflow');
	});
});
