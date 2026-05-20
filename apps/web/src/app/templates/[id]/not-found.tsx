import Link from "next/link";

export default function TemplateNotFound() {
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
        ไม่พบโปรแกรมนี้
      </p>
      <p
        style={{
          fontFamily: "K2D, sans-serif",
          fontSize: 13,
          color: "var(--ink-soft)",
          marginTop: 6,
        }}
      >
        อาจถูกลบหรือ URL ไม่ถูกต้อง
      </p>
      <Link
        href="/templates"
        className="btn-primary"
        style={{ marginTop: 24, minWidth: 160, display: "inline-flex" }}
      >
        ดูโปรแกรมทั้งหมด
      </Link>
    </div>
  );
}
