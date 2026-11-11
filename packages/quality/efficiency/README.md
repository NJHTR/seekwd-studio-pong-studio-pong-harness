# Efficiency tooling

This area owns resource measurements, microbenchmarks, and load-test tools.
The root `@pong/efficiency` workspace uses Playwright with shared reporting from `pong-playwright`.
Its configuration owns the efficiency projects and their scopes. Suites live in folders such as `images/`.

| Tool | Use it to | Guide |
| --- | --- | --- |
| `@pong/efficiency` | Measure Docker image size and layer waste with Dive | [Image measurements](images/README.md) |
| `@pong/efficiency` | Measure idle memory with fixed container profiles | [Idle memory baselines](memory/idle/README.md) |
| `@pong/performance` | Compare code paths without building an pong Docker image | [Microbenchmarks](microbenchmarks/README.md) |
| `@pong/pong-benchmark` | Run load scenarios against an pong instance | [Benchmark CLI](scale/benchmark/README.md) |

For memory retention, canvas performance, throughput, and local soak tests, use the [Playwright suite map](../testing/playwright/README.md#choose-a-suite).

Run image measurements with `pnpm --filter @pong/efficiency test:images`.
Run idle memory baselines with `pnpm --filter @pong/efficiency test:memory`.
The nested microbenchmark and benchmark CLI workspaces keep their own commands and configurations.
