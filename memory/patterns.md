---
_harness_template: "memory/patterns.md.template"
_harness_version: "2.5.27"
---

# Patterns (SSOT)

This file is the single source of truth for **reusable solutions (patterns)**.
Capture **problem → solution → applicability** so the same judgement can be
reproduced quickly next time.

## Index

- Dynamic-import heavy charting libs off First Load JS #perf #bundle-size #recharts #next-dynamic
- Dispatch domain-isolated tasks via tmux multiagent #orchestration #multiagent #tmux #send-task

---

## Dispatch domain-isolated tasks via tmux multiagent #orchestration #multiagent #tmux #send-task

### Problem

- A phase has 2+ tasks that each touch exactly one domain (e.g., one task in `packages/db`, another in `apps/line-bot`). Running them serially in Solo mode wastes wall time when they don't share files or types. The harness `--breezing` flag spawns ephemeral Workers, but doesn't preserve the named-agent identity that makes coordination across multi-week campaigns legible.

### Solution

- Use the project's `scripts/multiagent.sh` tmux setup. Each domain has a long-running Claude Code session in a named tmux window (`web-agent`, `line-bot-agent`, `db-agent`, `qa-agent`). The orchestrator session:
  1. Writes the phase to `Plans.md` so each agent has a shared task contract.
  2. Dispatches via `scripts/send-task.sh <agent> "<message>"` — the script handles bracketed-paste + delayed Enter for reliable delivery.
  3. Stops; does not poll.
  4. Receives agent replies as turn input (agents call `send-task.sh orchestrator "done[<name>]: ..."`).
  5. Aggregates and either ships or dispatches a follow-up (e.g., `send-task.sh qa "/quality-gate"`).

### Applies when

- Tasks are clearly domain-isolated — different files, no shared types, no merge risk.
- The phase has ≥2 tasks that can genuinely run in parallel.
- You want domain-specific context to persist across multiple tasks/cycles (vs harness's ephemeral Workers, which start fresh).

### Does not apply when

- Tasks share files or types (use Solo or harness `--breezing` with worktrees instead).
- A phase has only 1 task (Solo is faster — no tmux coordination overhead).
- You can't tolerate the higher token cost of keeping 4 persistent CC sessions warm.

### Example

```bash
# Orchestrator (this session)
./scripts/send-task.sh db 'Run /harness-work 22.1 — DB migration for 3 missing indexes per Plans.md'
./scripts/send-task.sh line-bot 'Run /harness-work 22.2 — handleCheckIn → Flex per Plans.md'

# Wait — DO NOT poll. Agents will reply when done.

# Verify dispatch only:
source scripts/multiagent.sh && agent_status
# Expect: 🌐 web IDLE | 💬 line WORKING | 🗄 db WORKING | ✅ qa IDLE
```

### Caveats

- **send-task.sh path resolution from agent cwd**: agents run from their package subdir (`apps/web`, `packages/db`, …). The relative path `./scripts/send-task.sh` does NOT resolve from those directories. Two fixes work today:
  1. Tell each agent the absolute path in the dispatch message (`/Users/.../saifit/scripts/send-task.sh`).
  2. Have agents resolve `$REPO_ROOT/scripts/send-task.sh` themselves via `git rev-parse --show-toplevel`.
  Observed when db-agent fell back to inline reporting instead of send-task because `./scripts/send-task.sh` returned ENOENT.
- **Reply arrives as turn input**: agent replies via send-task land in the orchestrator's input pane and surface as the user's next-turn message. Multiple replies in flight may concatenate or arrive at slightly different times. Treat the orchestrator as the aggregator — never as a synchronous RPC.
- **Don't poll**: the orchestrator skill is explicit about this. Use `agent_status` to verify dispatch landed, then stop. Agents finish on their own timeline.
- **`agent_status` is best-effort**: it greps "esc to interrupt" in the pane capture, so a momentary IDLE between phases can be misread. If unsure, capture-pane on the specific window.

### Related

- decisions: —
- references: Phase 22 dispatch in Plans.md; `scripts/multiagent.sh`; `scripts/send-task.sh`; orchestrator system prompt in `CLAUDE.md` (project root)

---

## Dynamic-import heavy charting libs off First Load JS #perf #bundle-size #recharts #next-dynamic

### Problem

- Routes that render charts pull the entire chart library (e.g. Recharts ~100 kB) into First Load JS, even when the chart is below the fold or behind a conditional. Bangkok-mobile users on 4G feel this directly. /progress and /exercises/[slug] were both ~240 kB First Load.

### Solution

- Extract every chart-using JSX block into a separate `_components/<name>-chart.tsx` client component, then import it via `next/dynamic` with `ssr: false` from the route page. Webpack emits a separate chunk; Recharts only loads when the chart is about to render.

### Applies when

- A single route has ≥1 chart and Recharts (or similarly heavy lib) is in its First Load JS
- The chart is below-fold OR conditional OR not the primary hero of the page
- The chart doesn't need SSR (Recharts measures SVG dimensions in browser anyway, so ssr:false is honest, not a hack)

### Does not apply when

- The chart IS the page (e.g. a dedicated chart-detail view where the user navigated specifically to see it — defer is wasted, you'd just delay LCP)
- The lib is already shared across enough routes that webpack put it in the shared chunk (then dynamic-import on one route doesn't free anything)

### Example

```tsx
// route page
import dynamic from "next/dynamic";
const TrendChart = dynamic(
  () => import("./_components/progress-charts").then((m) => m.TrendChart),
  { ssr: false },
);
// ...
<TrendChart records={data} />;
```

```text
Result on Saifit (Phase 21.3):
  /progress           241 kB → 138 kB  (−103 kB, −43%)
  /exercises/[slug]   239 kB → 136 kB  (−103 kB, −43%)
```

### Caveats

- `ssr: false` means the chart renders only on the client. A skeleton or placeholder helps prevent layout shift. Recharts already requires client because it measures DOM, so honestly declaring it is better than hiding the constraint.
- If you keep using the same chart components in 3+ routes, the dynamic-imported chunk may become a shared chunk anyway. Re-measure before assuming the win is permanent.
- Watch out for orphaned imports left in the page file (XAxis, BarChart, etc.) — biome's `noUnusedImports` will flag, but a manual sweep prevents a confusing red diff.

### Related

- decisions: —
- references: Phase 21.3 in Plans.md; `apps/web/src/app/progress/_components/progress-charts.tsx`; `apps/web/src/app/exercises/[slug]/_components/history-chart.tsx`

### Problem

- (What situation makes this hard)

### Solution

- (How to resolve it)

### Applies when

- (Conditions where this pattern is the right tool)

### Does not apply when

- (Conditions where this pattern is the wrong tool)

### Example (optional)

```text
(code, pseudo-code, or config sample if useful)
```

### Caveats

- (Pitfalls, observability/logging notes, operational gotchas)

### Related

- decisions: (link if applicable)
- references:
