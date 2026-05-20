"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function WorkoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="saifit-bg"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "K2D, sans-serif",
          fontSize: 15,
          color: "var(--ink)",
          fontWeight: 500,
        }}
      >
        โหลดข้อมูลไม่สำเร็จ
      </p>
      <p
        style={{
          fontFamily: "K2D, sans-serif",
          fontSize: 13,
          color: "var(--ink-soft)",
          marginTop: 6,
        }}
      >
        กรุณาลองใหม่อีกครั้ง
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button type="button" onClick={reset} className="btn-primary" style={{ minWidth: 120 }}>
          ลองใหม่
        </button>
        <Link
          href="/"
          style={{
            minWidth: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 48,
            padding: "0 20px",
            borderRadius: 14,
            border: "1px solid var(--glass-line)",
            fontFamily: "K2D, sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--ink-soft)",
            textDecoration: "none",
          }}
        >
          กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
