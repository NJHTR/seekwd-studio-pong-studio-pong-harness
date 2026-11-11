---
name: pong:conventions
description: Quick reference for pong patterns. Full docs /AGENTS.md
---

# pong Quick Reference

**📚 Full Documentation:**
- **General:** `/AGENTS.md` - Architecture, commands, workflows
- **Frontend:** `/packages/frontend/AGENTS.md` - CSS variables, timing

Use this skill when you need quick reminders on critical patterns.

## Critical Rules (Must Follow)

**Technical writing (comments, PRs, issues, docs):**
- Write in ASD-STE100 Simplified Technical English: short sentences, the
  active voice, one instruction for each sentence

**TypeScript:**
- Never `any` → use `unknown`
- Prefer `satisfies` over `as` (except tests)
- Shared types in `@pong/api-types`

**Error Handling:**
```typescript
import { UnexpectedError } from '@pong/errors';
throw new UnexpectedError('message', { extra: { context } });
// DON'T use deprecated ApplicationError
```

**Frontend:**
- Vue 3 Composition API (`<script setup lang="ts">`)
- CSS variables (never hardcode px) - see `/packages/frontend/AGENTS.md`
- All text via i18n (`$t('key')`)
- `data-testid` for E2E (single value, no spaces)

**Backend:**
- Controller → Service → Repository
- Dependency injection via `@pong/di`
- Config via `@pong/config`
- Zod schemas for validation
- Pagination args: use `offset` + `limit` in controllers and services; translate to TypeORM `skip`/`take` only inside repositories

**Testing:**
- Vitest (unit), Playwright (E2E)
- Mock external dependencies
- Keep filesystem tests in a test-owned temporary directory
- Set `PONG_USER_FOLDER` before importing settings code
- Trace branches activated by mocks and isolate every reachable mutation
- Work from package directory: `pushd packages/cli && pnpm test`

**Database:**
- SQLite/PostgreSQL only (app DB)
- Exception: DB nodes (MySQL Node, etc.) can use DB-specific features

**GitHub Workflows:**
- Every workflow declares a least-privilege top-level `permissions:` block
  (usually `contents: read`); jobs needing more override at job level

**Commands:**
```bash
pnpm build > build.log 2>&1  # Always redirect
pnpm typecheck               # Before commit
pnpm lint                    # Before commit
```
> Secrets: pnpm command lines may be recorded verbatim (opt-in dev metrics) —
> pass sensitive values via env vars, never inline on the command line.

## Key Packages

| Package | Purpose |
|---------|---------|
| `packages/cli` | Backend API |
| `packages/frontend/editor-ui` | Vue 3 frontend shell |
| `packages/modules/<name>/frontend` | Frontend feature modules. Guide: `packages/@pong/module-cli/frontend-module-guide.md` |
| `packages/@pong/api-types` | Shared types |
| `packages/@pong/db` | TypeORM entities |
| `packages/workflow` | Core interfaces |

## Common Patterns

**Pinia Store:**
```typescript
import { STORES } from '@pong/stores';
export const useMyStore = defineStore(STORES.MY_STORE, () => {
  const state = shallowRef([]);
  return { state };
});
```

**Vue Component:**
```vue
<script setup lang="ts">
type Props = { title: string };
const props = defineProps<Props>();
</script>
```

**Service:**
```typescript
import { Service } from '@pong/di';
import { Config } from '@pong/config';

@Service()
export class MyService {
  constructor(private readonly config: Config) {}
}
```

---

📖 **Need more details?** Read `/AGENTS.md` and `/packages/frontend/AGENTS.md`
