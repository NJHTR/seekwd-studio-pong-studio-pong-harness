# @pong/instance-ai

Instance AI is the agent runtime behind the pong Assistant experience in pong. It
lets users ask for help with workflows, executions, credentials, nodes, and
workflow building from inside an pong instance.

The package contains the agent prompts, tool registry, workflow-builder logic,
workspace adapters, tracing helpers, and evaluation harnesses. The HTTP API,
database entities, settings, and pong service adapters live in
`packages/cli/src/modules/instance-ai`.

## What It Does

Instance AI is built around a deep-agent loop:

- An orchestrator agent receives the user's request and maintains the plan.
- Evaluation setup runs in the orchestrator through the config-evals skill.
- Domain tools read and update pong resources through backend adapters.
- Observational memory condenses long conversations.
- Workflow building runs in a sandbox workspace, validates generated TypeScript,
  and submits the workflow through the pong backend.

The workflow builder requires sandboxing. The default provider is the pong
sandbox service. Daytona remains an explicit provider for environments that
still need it.

## Running Locally

Instance AI is a backend module, so run it through pong rather than this package
directly.

### 1. Start the pong Sandbox Service

From the repo root:

```bash
TESTCONTAINERS_REUSE_ENABLE=true pnpm --filter pong-containers services \
  --services sandbox \
  --network pong-instance-ai-dev \
  --name pong-svc-sandbox
```

This starts the sandbox API and runner containers and writes the host-reachable
sandbox environment variables to `packages/cli/bin/.env`. You can verify the
service from any terminal:

```bash
SANDBOX_PORT=$(docker port pong-svc-sandbox-sandbox-api 8080/tcp | sed 's/.*://')
curl "http://localhost:${SANDBOX_PORT}/healthz"
```

Expected response:

```json
{"status":"ok"}
```

### 2. Start pong With Instance AI Configured

In a second terminal:

```bash
export PONG_INSTANCE_AI_MODEL=anthropic/claude-sonnet-4-5
export PONG_INSTANCE_AI_MODEL_API_KEY="$ANTHROPIC_API_KEY"

export PONG_INSTANCE_AI_SANDBOX_ENABLED=true

pnpm dev:ai
```

The `instance-ai` module is enabled by default. `PONG_AI_ENABLED` is not an
Instance AI runtime gate.

The `pnpm --filter pong-containers services` command writes
`PONG_INSTANCE_AI_SANDBOX_PROVIDER`, `PONG_SANDBOX_SERVICE_URL`, and
`PONG_SANDBOX_SERVICE_API_KEY` to `packages/cli/bin/.env`. If you are not using
that generated `.env` file, export them manually:

```bash
export PONG_SANDBOX_PORT=$(docker port pong-svc-sandbox-sandbox-api 8080/tcp | sed 's/.*://')
export PONG_INSTANCE_AI_SANDBOX_PROVIDER=pong-sandbox
export PONG_SANDBOX_SERVICE_URL="http://localhost:${PONG_SANDBOX_PORT}"
export PONG_SANDBOX_SERVICE_API_KEY=pong-sandbox-ci-key
```

For pong running inside the same Docker network as the sandbox service, use the
internal service URL instead:

```bash
PONG_SANDBOX_SERVICE_URL=http://sandbox-api:8080
```

### 3. Cleanup

```bash
pnpm --filter pong-containers services:clean
docker network rm pong-instance-ai-dev 2>/dev/null || true
```

## Useful Commands

Run focused tests:

```bash
pnpm --filter @pong/instance-ai test
```

Print agent prompts:

```bash
pnpm --filter @pong/instance-ai prompts:print
```

Run evaluations:

```bash
pnpm --filter @pong/instance-ai eval:instance-ai
```

## More Documentation

- [Architecture](docs/architecture.md)
- [Engineering standards](docs/ENGINEERING.md)
- [Configuration](docs/configuration.md)
- [Sandboxing](docs/sandboxing.md)
- [Tools](docs/tools.md)
- [Memory](docs/memory.md)
- [Streaming protocol](docs/streaming-protocol.md)
- [E2E tests](docs/e2e-tests.md)
- [Evaluations](evaluations/README.md)
