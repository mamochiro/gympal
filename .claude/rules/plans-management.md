---
description: Plans.md task management rules (applied only when editing Plans.md)
paths:
  - "**/Plans.md"
_harness_template: "rules/plans-management.md.template"
_harness_version: "2.5.27"
---

# Plans.md Management Rules

## Task entry format

```markdown
- [ ] Task description `marker`
  - Subtask 1
  - Subtask 2
```

## Marker usage

| Marker | Set by | Meaning |
|--------|--------|---------|
| `pm:依頼中` | PM (Cursor / PM Claude) | Requested |
| `cc:TODO` | Claude Code | Not started |
| `cc:WIP` | Claude Code | In progress |
| `cc:完了` | Claude Code | Completed |
| `pm:確認済` | PM (Cursor / PM Claude) | Review complete |
| `cursor:依頼中` | Cursor | (compat) same as `pm:依頼中` |
| `cursor:確認済` | Cursor | (compat) same as `pm:確認済` |

> The Japanese-looking markers above are **protocol identifiers** searched by
> the compiled `harness` Go binary — treat them as opaque tokens, like Git's
> `HEAD`. Do not translate them.

## Section layout

```markdown
## 🔴 In Progress
(tasks with cc:WIP)

## 🟡 Not Started
(tasks with cc:TODO or pm:依頼中 / cursor:依頼中)

## 🟢 Completed
(tasks with cc:完了 or pm:確認済 / cursor:確認済)

## 📦 Archive
(older completed tasks)
```

## Update rules

1. **Update immediately**: set `cc:WIP` when starting a task, `cc:完了` the moment it finishes.
2. **Add a summary**: when finishing, append a short summary of what was done.
3. **Record the date**: completed entries get a `(YYYY-MM-DD)` date.
4. **Archive**: completed tasks older than 7 days move to the 📦 Archive section.

## Prohibited

- ❌ Changing markers written by another agent without coordination
- ❌ Deleting in-progress tasks
- ❌ Marking a task complete without a summary

---

## Extended syntax (optional)

For larger plans, the following syntax is **optional**:

```markdown
- [ ] T001: Auth `cc:TODO`
- [ ] T002: User API `cc:TODO` depends:T001
- [ ] T003: Product API `cc:TODO` [P]
```

| Syntax | Meaning |
|--------|---------|
| `T001:` | Task ID (used for dependencies) |
| `depends:ID` | Dependency task (comma-separated for multiple) |
| `[P]` | Parallelizable |

**Backward compatible**: plans without this syntax continue to work as before.
