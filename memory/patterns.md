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
