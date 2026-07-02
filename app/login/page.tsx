"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("That password isn't right.");
        setBusy(false);
        return;
      }
      router.push(params.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F6F6F3",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 300,
          padding: 28,
          background: "white",
          border: "1px solid #E6E6E1",
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(30,30,32,0.08)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: "#232326", marginBottom: 4 }}>Scriblic</div>
        <div style={{ fontSize: 13, color: "#9A9AA2", marginBottom: 18 }}>Enter the password to continue.</div>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #E6E6E1",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
            marginBottom: 12,
          }}
        />
        {error && <div style={{ fontSize: 12, color: "#E5484D", marginBottom: 12 }}>{error}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 8,
            border: "none",
            background: "#232326",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
