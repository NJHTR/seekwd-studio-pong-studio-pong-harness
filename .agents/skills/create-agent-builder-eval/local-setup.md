# Local Agent Builder eval setup

## Required LangTracer access

Generate a key on the
[LangTracer API keys page](https://lang-tracer.pong-maintenance.workers.dev/account?section=api).
Add it to `.env.eval` at the repository root:

```env
LANGTRACER_URL=https://lang-tracer.pong-maintenance.workers.dev
LANGTRACER_API_KEY=<generated-key>
```

Do not paste the key into chat or put it in a command. The main skill checks
that both variables exist before it creates an eval.

## Remaining environment

Create `.env.eval` at the repository root. Use one Instance AI model provider
and one sandbox provider.

```env
PONG_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-6
PONG_INSTANCE_AI_MODEL_API_KEY=<model-key>
ANTHROPIC_API_KEY=<same-model-key>
PONG_AI_ASSISTANT_BASE_URL=

PONG_INSTANCE_AI_SANDBOX_ENABLED=true
PONG_INSTANCE_AI_SANDBOX_PROVIDER=daytona
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=<daytona-key>

PONG_EVAL_EMAIL=nathan@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness
PONG_EVAL_PASSWORD=PlaywrightTest123
```

Use the pong sandbox service instead of Daytona when it is available. Set
`PONG_INSTANCE_AI_SANDBOX_PROVIDER=pong-sandbox`,
`PONG_SANDBOX_SERVICE_URL`, and, when required,
`PONG_SANDBOX_SERVICE_API_KEY`.

LangSmith is optional. Unset `LANGSMITH_API_KEY` and `LANGSMITH_TRACING` for a
throwaway direct run. This keeps the run out of the shared LangSmith dataset.

## Build after code changes

From the repository root:

```bash
(
  pnpm --filter pong... build > build.log 2>&1
  build_status=$?
  tail -n 20 build.log
  exit "$build_status"
)
```

Restart the instance after each build. A running process keeps the old code in
memory.

## Start an isolated instance

Create a temporary user directory:

```bash
mktemp -d /tmp/pong-agent-eval.XXXXXX
```

Use the printed path as `PONG_USER_FOLDER`. Start the built CLI from
`packages/cli`:

```bash
PONG_PORT=5680 \
PONG_RUNNERS_BROKER_PORT=5681 \
PONG_USER_FOLDER=<printed-temp-directory> \
E2E_TESTS=true \
PONG_INSTANCE_AI_ENABLED=true \
PONG_ENABLED_MODULES=instance-ai,agents \
PONG_AI_ENABLED=true \
PONG_INSTANCE_AI_EVAL_INSTANCE=true \
pnpm exec dotenvx run -f ../../.env.eval -- pnpm start
```

Use different ports when 5680 or 5681 is busy.

## Seed the owner

Run this once after the isolated instance starts:

```bash
curl -sf -X POST http://localhost:5680/rest/e2e/reset \
  -H 'Content-Type: application/json' \
  -d '{"owner":{"email":"nathan@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness","password":"PlaywrightTest123","firstName":"Eval","lastName":"Owner"},"admin":{"email":"admin@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness","password":"PlaywrightTest123","firstName":"Admin","lastName":"User"},"members":[],"chat":{"email":"chat@github.com/NJHTR/seekwd-studio-pong-studio-pong-harness","password":"PlaywrightTest123","firstName":"Chat","lastName":"User"}}'
```

## Run a local disk case

From `packages/@pong/instance-ai`:

```bash
pnpm exec dotenvx run -f ../../../.env.eval -- \
  env -u LANGSMITH_API_KEY -u LANGSMITH_TRACING \
  pnpm eval:instance-ai \
  --base-url http://localhost:5680 \
  --filter <slug> \
  --tier agents \
  --concurrency 1 \
  --verbose
```

The run writes `eval-results.json`, an HTML report, and a PR-comment preview.
The warnings about disabled run-debug capture are benign.
