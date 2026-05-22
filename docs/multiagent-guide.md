# Multi-agent orchestration — guide

A practical walkthrough for using the tmux multi-agent setup in this repo, paired with the harness skills (`/harness-plan`, `/harness-work`, `/harness-loop`).

## TL;DR

```bash
# 1. Start the agents (once per session)
./scripts/multiagent.sh web line-bot db qa

# 2. Inside the orch window (window 0), use Claude Code
#    → write Plans.md (or use /harness-plan create)
#    → dispatch tasks to domain agents:
./scripts/send-task.sh db "<task instruction with $REPO absolute paths>"

# 3. Wait. Don't poll. Agents reply via:
#    /Users/sarawut/github/saifit/scripts/send-task.sh orchestrator "done[<name>]: ..."

# 4. Run qa gate after all domain agents report done.

# 5. Push.
```

That's the whole loop. The rest of this doc explains *when* and *why*.

---

## When this pattern is the right tool

| Situation | Use multiagent? |
|---|---|
| 1 task, any domain | ❌ Solo `/harness-work N` is faster |
| 2–3 tasks, same files | ❌ Solo or `/harness-work --parallel N` with worktrees |
| 2–3 tasks, **clean domain isolation** (one in `apps/web`, one in `packages/db`, etc.) | ✅ Multiagent shines |
| 4+ tasks across 3+ domains | ✅ Multiagent or `/harness-work --breezing` (worktrees) |
| Multi-week campaign needing domain context to persist | ✅ Multiagent (agents stay warm) |
| Just one prompt to one agent | ❌ Overkill — open a regular Claude Code session |

**Honest read for Saifit at current scale**: most phases are 1–6 tasks Solo-mode and ship cleanly without multiagent. Reach for it when you genuinely have domain-isolated parallel work or a deploy-style multi-domain campaign.

---

## One-time setup (already done in this repo)

These pieces exist already; documented here so you know what's in play:

- `scripts/multiagent.sh` — spawns the tmux session `gympal-agents` with 4 named agent windows + 1 orchestrator + 1 watch window
- `scripts/send-task.sh` — reliable message delivery (handles Claude Code's bracketed-paste + Enter quirk)
- `~/.claude/profiles/gympal-<agent>.md` — per-agent system prompts that give each agent its domain identity
- `CLAUDE.md` (project root) — the orchestrator system prompt; loaded by the orch window's Claude Code session

---

## Day-to-day workflow

### Step 1 — start the agents

In any terminal:

```bash
cd ~/github/saifit
./scripts/multiagent.sh web line-bot db qa     # all four
# or fewer if you only need some:
./scripts/multiagent.sh web db                  # just web + db
```

tmux opens with these windows (Ctrl+b N to switch):

| Window | Name | What runs there |
|---|---|---|
| 0 | 🎯orch | Orchestrator Claude Code session (you talk here) |
| 1 | 🌐web | Claude Code in `apps/web` |
| 2 | 💬line | Claude Code in `apps/line-bot` |
| 3 | 🗄db | Claude Code in `packages/db` |
| 4 | ✅qa | Claude Code in repo root (for `pnpm -r test`, biome, etc.) |
| 5 | 👁watch | Status tail of all panes |

Each agent's Claude Code starts with its own profile and a load of `CLAUDE.md`. From the orch window, you drive the rest.

### Step 2 — verify all agents are alive

From the orch window's terminal (or any shell):

```bash
source scripts/multiagent.sh && agent_status
```

You should see `✓ IDLE` for each agent. If one shows `⏳ WORKING` you didn't expect, capture its pane:

```bash
tmux capture-pane -t gympal-agents:<N> -p | tail -40
```

### Step 3 — plan the phase

In the orchestrator window (Claude Code), write the phase to `Plans.md` directly or use:

```text
/harness-plan create
```

The phase must define tasks **by domain**. Example structure:

```markdown
### Phase N — <theme>

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| N.1  | <db work>      | <verifiable DoD> | -  | cc:TODO |
| N.2  | <web work>     | <verifiable DoD> | -  | cc:TODO |
| N.3  | <line-bot work>| <verifiable DoD> | N.1| cc:TODO |
```

Commit the Plans.md update **before dispatching** so each agent can read its task from the same file.

### Step 4 — dispatch in parallel

From the orchestrator shell:

```bash
REPO=/Users/sarawut/github/saifit

./scripts/send-task.sh db "Phase N.1 — <task title>. See $REPO/Plans.md for DoD.
Briefly: <2-3 sentence summary>.
Constraints: run tsc + vitest before reporting; commit conventionally.
When done: $REPO/scripts/send-task.sh orchestrator \"done[db]: <summary + commit hash>\"
If blocked: $REPO/scripts/send-task.sh orchestrator \"blocked[db]: <reason>\"
Time-box: 30 min."

./scripts/send-task.sh line-bot "Phase N.3 — <task title>. See $REPO/Plans.md for DoD.
..."
```

**Critical rules for the dispatch message:**

1. **Always use absolute paths** for `send-task.sh` inside the dispatch message. Agents work from their package subdir; `./scripts/send-task.sh` does NOT resolve from `apps/web` or `packages/db`. This bit us with db-agent on the first try — they fell back to inline reporting instead of replying via send-task.
2. **Always include** `done[name]:` and `blocked[name]:` reply templates so the agent knows the exact reply format.
3. **Time-box** every task. Prevents runaway exploration.
4. **Reference** `Plans.md` so agent + orchestrator share a single source of truth for DoD.

### Step 5 — verify dispatch, then stop

```bash
source scripts/multiagent.sh && agent_status
# Expect: ⏳ WORKING on the agents you just messaged
```

If one stays `✓ IDLE` for >15 seconds, re-send. Bracketed-paste delivery isn't 100%.

**Then stop.** Do not poll. Do not run `agent_status` in a loop. The orchestrator skill explicitly forbids it. Agents finish on their own timeline (typically 1–10 min per task).

### Step 6 — receive replies

Agent replies via `send-task.sh orchestrator "done[name]: ..."` land as text in the orchestrator window's input pane. They surface as your next-turn user message in the orchestrator's Claude Code session.

Reply forms you'll see:

| Reply | Meaning | Orchestrator next move |
|---|---|---|
| `done[db]: <summary> commit <hash>` | Task done, hash on main | Note the hash; check if dependents can start |
| `blocked[db]: <reason>. Need: <what>` | Agent stuck | Unblock yourself or delegate the unblock |
| `need[A→B]: <request>` | Cross-agent dependency | Send to B first, resume A when B done |

### Step 7 — run the quality gate

When all domain agents have reported `done`, dispatch qa:

```bash
./scripts/send-task.sh qa "Phase N quality gate. Commits: <hash1> <hash2>.
Please run:
1) git log --oneline <base>..HEAD — confirm expected commits
2) Per touched package: cd <pkg> && pnpm exec tsc --noEmit
3) From repo root: pnpm -r test
4) From repo root: <absolute>/node_modules/.bin/biome check
5) Confirm Plans.md still parses
Report: $REPO/scripts/send-task.sh orchestrator \"done[qa]: <verdict + numbers>\"
Read-only. Do NOT commit anything.
Time-box: 5 min."
```

qa replies APPROVE or NEEDS_FIXES. If NEEDS_FIXES, route the specific issue back to the responsible agent.

### Step 8 — close the phase + push

In the orchestrator window:

1. Update Plans.md task markers to `cc:完了 [<commit-hash>]` for each completed task
2. Commit the Plans.md close-out: `docs(plans): close Phase N — <theme>`
3. `git push origin main`

---

## The 6 most useful commands

```bash
# Start the session
./scripts/multiagent.sh web line-bot db qa

# Snapshot status of all agents (one-shot, don't loop it)
source scripts/multiagent.sh && agent_status

# Dispatch to a specific agent
./scripts/send-task.sh <agent> "<message with absolute send-task.sh path>"

# Inspect what an agent is doing right now
tmux capture-pane -t gympal-agents:<N> -p | tail -40

# Attach the tmux session (in a fresh terminal)
tmux attach -t gympal-agents
# then Ctrl+b <N> to switch windows: 0=orch, 1=web, 2=line, 3=db, 4=qa, 5=watch

# Kill the whole session when done for the day
tmux kill-session -t gympal-agents
```

---

## Pitfalls observed (do not repeat)

### 1. Relative path for `send-task.sh` from agent cwd

**Symptom**: agent finishes its work but reports inline instead of via send-task. You only learn it's done by reading its pane.

**Cause**: agent cwd is the package dir; `./scripts/send-task.sh` doesn't exist there.

**Fix**: always use the absolute path in dispatch messages:
```text
$REPO/scripts/send-task.sh orchestrator "done[<name>]: ..."
```
or have the agent resolve:
```bash
"$(git rev-parse --show-toplevel)/scripts/send-task.sh"
```

### 2. Polling temptation

**Symptom**: you find yourself running `agent_status` over and over. Burns context, accomplishes nothing.

**Fix**: dispatch → verify once → **stop**. Agents reply when done. The orchestrator skill is explicit about this.

### 3. Reply collision

**Symptom**: two agents finish at the same moment; their replies merge into a single user-turn input in the orchestrator.

**Fix**: that's actually fine — the orchestrator handles concatenated replies. Just be aware the boundary between agent messages can be subtle. Look for the `done[<name>]:` prefix to separate them.

### 4. Agents committing to main directly

**Observation**: tmux agents commit directly to `main`, not feature branches. Different from harness `--breezing` which uses worktrees + cherry-pick.

**Tradeoff**: simpler history, but no per-agent isolation if two agents touch the same file. The mitigation is **domain isolation in the phase plan** — only dispatch parallel tasks that touch different files.

### 5. Orphan working-tree state

**Observation**: agents that run `pnpm build` (or similar) may leave regenerated artifacts (e.g., `apps/web/public/sw.js`) in the working tree even though they weren't part of the task.

**Fix at gate time**: `git checkout -- <file>` to drop the orphan, or add to gitignore if it's truly auto-generated.

---

## Decision tree: which orchestration mode for this work?

```
Has the phase 1 task only?
├── YES → Solo: /harness-work N
└── NO ↓

Are tasks in the same files / share types?
├── YES → /harness-work --breezing  (worktree-isolated)
└── NO ↓

Are tasks 2–3 in count, no domain agents needed?
├── YES → /harness-work --parallel N  (ephemeral subagents)
└── NO ↓

Tasks cleanly split by domain (web/db/line-bot)?
├── YES → tmux multiagent (this guide)
└── NO → start with /harness-plan create to figure out scope
```

---

## Worked example (real session, 2026-05-22)

From this session's git log, Phase 22 used the full pattern:

```
1. /harness-plan create                    ← orchestrator wrote Plans.md
   commit 42f6278

2. send-task.sh db <22.1 dispatch>         ← parallel dispatch
   send-task.sh line-bot <22.2 dispatch>

3. (wait — no polling)

4. done[db]: ... commit d0bdd93            ← agents committed directly to main
   done[line-bot]: ... commit 62d4577

5. send-task.sh qa <gate>                  ← gate dispatch

6. done[qa]: APPROVE 126/126               ← gate result

7. orchestrator: closed Plans.md           ← commit dfd0f32
   git push origin main
```

Total wall-clock: ~15 min for 2 commits + 1 gate + +5 tests + a real DB-perf win + last LINE handler migrated. Two agents worked in parallel; qa was idle during their work and ran the gate only after both reported.

---

## Related reading

- `memory/patterns.md` — "Dispatch domain-isolated tasks via tmux multiagent" entry (the same pattern in more abstract form for any future project)
- `memory/decisions.md` — strategic decisions log (when this pattern was picked over alternatives)
- `CLAUDE.md` (project root) — the orchestrator system prompt that the orch window loads
- `scripts/multiagent.sh` — source of truth for window setup + helper functions
- `scripts/send-task.sh` — the bracketed-paste delivery script
