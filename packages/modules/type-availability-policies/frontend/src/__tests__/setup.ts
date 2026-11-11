// The shared frontend test harness: the jsdom environment, english messages, and a fresh pinia
// per test. It lives in `@pong/frontend-test-utils` rather than in `@pong/vitest-config`, because
// `@pong/i18n` devDepends on the latter and importing i18n there closes a cycle in the turbo graph.
import '@pong/frontend-test-utils/setup';
