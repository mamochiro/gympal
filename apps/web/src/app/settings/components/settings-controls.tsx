"use client";

export function PillRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | number | null;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`pill${String(value) === opt.value ? " is-active" : ""}`}
          style={{ height: 44 }}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function GlassSegmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="glass"
      style={{ display: "flex", padding: 4, gap: 4, borderRadius: 14, margin: "0 24px" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            fontFamily: "K2D, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            border: 0,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
            background: value === opt.value ? "rgba(140,100,255,0.18)" : "transparent",
            color: value === opt.value ? "var(--ink)" : "var(--ink-soft)",
            boxShadow:
              value === opt.value
                ? "0 0 0 1px var(--violet-edge), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function VioletToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        width: 48,
        height: 28,
        alignItems: "center",
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        transition: "background 0.2s",
        background: checked
          ? "linear-gradient(135deg, oklch(65% 0.22 280), oklch(60% 0.20 240))"
          : "rgba(255,255,255,0.08)",
        boxShadow: checked ? "0 0 14px var(--violet-glow)" : "none",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          transition: "transform 0.2s",
          transform: checked ? "translateX(24px)" : "translateX(4px)",
        }}
      />
    </button>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="saifit-bg" style={{ minHeight: "100vh", padding: "40px 24px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            height: 28,
            width: "40%",
            borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        {(["s1", "s2", "s3", "s4", "s5", "s6"] as const).map((k) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                height: 10,
                width: 64,
                borderRadius: 4,
                background: "rgba(255,255,255,0.04)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div
              style={{
                height: 52,
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
