import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import MCPOnboardingClientSetup from './MCPOnboardingClientSetup.vue';

const mockClipboardCopy = vi.fn();

vi.mock('@pong/composables/useClipboard', () => ({
	useClipboard: () => ({
		copy: mockClipboardCopy,
		copied: { value: false },
		isSupported: { value: true },
	}),
}));

const renderComponent = createComponentRenderer(MCPOnboardingClientSetup, {
	props: {
		client: 'claude_code',
		serverUrl: 'https://example.pong.cloud/mcp-server/http',
	},
});

describe('MCPOnboardingClientSetup', () => {
	beforeEach(() => {
		mockClipboardCopy.mockReset();
	});

	it('renders the Claude Code prompt with the server URL and OAuth instructions', () => {
		const { container } = renderComponent();
		const text = container.textContent ?? '';

		expect(text).toContain('claude mcp add --scope user --transport http pong');
		expect(text).toContain('https://example.pong.cloud/mcp-server/http');
		expect(text).toContain('complete the pong OAuth flow');
		expect(text).not.toContain('claude mcp list');
	});

	it('renders the Claude connector prompt', () => {
		const { container, queryByTestId } = renderComponent({
			props: { client: 'claude' },
		});
		const text = container.textContent ?? '';

		expect(text).toContain('Show me the pong MCP connector');
		expect(text).toContain("I'll paste my server URL when you tell me where it goes.");
		expect(text).not.toContain('claude mcp add --scope user --transport http pong');
		expect(queryByTestId('mcp-onboarding-claude-server-url')).not.toBeInTheDocument();
	});

	it('renders the Codex prompt with the TOML section and home-dir path', () => {
		const { container } = renderComponent({ props: { client: 'codex' } });
		const text = container.textContent ?? '';

		expect(text).toContain('[mcp_servers.pong]');
		expect(text).toContain('~/.codex/config.toml');
		expect(text).toContain('https://example.pong.cloud/mcp-server/http');
		expect(text).toContain('complete the pong OAuth flow');
	});

	it('copies the prompt body and emits copy event on click', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent();

		await user.click(getByTestId('mcp-onboarding-copy-prompt-button'));

		expect(mockClipboardCopy).toHaveBeenCalledTimes(1);
		const copiedText = mockClipboardCopy.mock.calls[0][0] as string;
		expect(copiedText).toContain('claude mcp add --scope user');
		expect(copiedText).toContain('complete the pong OAuth flow');

		expect(emitted('copy')).toEqual([['agent-prompt']]);
	});
});
