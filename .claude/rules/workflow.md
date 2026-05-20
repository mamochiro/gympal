---
description: Core rules for the 2-agent workflow
alwaysApply: true
_harness_template: "rules/workflow.md.template"
_harness_version: "2.5.27"
---

# 2-Agent Workflow Rules

This project uses a **PM ↔ Impl** two-role workflow.
The PM role can be filled by **Cursor** or by **PM Claude** (PM Claude is recommended for solo operation).

## Roles

| Agent | Responsibility |
|-------|----------------|
| **PM (Cursor / PM Claude)** | Planning, review, decisions, and (when needed) production deploys |
| **Impl (Claude Code / Impl Claude)** | Implementation, tests, commits, and (when needed) staging |

## Task management

- All tasks live in `Plans.md`
- Status is tracked via marker tokens:
  - `pm:依頼中` → requested by PM (compat alias: `cursor:依頼中`)
  - `cc:WIP` → Claude Code is working
  - `cc:完了` → Claude Code finished the task
  - `pm:確認済` → PM completed review (compat alias: `cursor:確認済`)

> The marker tokens above look Japanese but function as opaque protocol
> identifiers searched by the compiled `harness` Go binary. Do not translate
> the tokens themselves.

## Handoff protocol

### PM → Impl
1. Add the task to `Plans.md` with marker `pm:依頼中` (or compat `cursor:依頼中`)
2. **PM Claude**: run `/handoff-to-impl-claude` to generate the request prompt
3. **Cursor**: run `/handoff-to-claude` (Cursor-side command) to generate the request prompt
4. Paste into Impl Claude (Claude Code)

### Impl → PM
1. When finished, set the marker to `cc:完了`
2. **PM Claude**: run `/handoff-to-pm-claude` to generate the completion report
3. **Cursor**: run `/handoff-to-cursor` to generate the completion report
4. Paste back to the PM for review (PM sets `pm:確認済` after review)

## Prohibited

- ❌ Publishing development-only files externally (CLAUDE.md, AGENTS.md, Plans.md)
- ❌ Large-scale refactors without an explicit request
- ❌ Shipping features without tests
- ❌ Direct production deploys (PM approval required)
