import { useState, useEffect, type FormEvent } from "react";

const STORAGE_KEY = "bridge_manager_token";

async function verifyCode(code: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch("/api/manager-auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok && data.success) return { ok: true, token: data.token };
    return { ok: false, error: data.error || "Code incorrect" };
  } catch {
    return { ok: false, error: "Erreur de connexion au serveur" };
  }
}

export function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setUnlocked(true);
    setChecking(false);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{9}$/.test(code)) {
      setError("Le code doit contenir exactement 9 chiffres.");
      return;
    }
    setSubmitting(true);
    const result = await verifyCode(code);
    setSubmitting(false);
    if (result.ok && result.token) {
      localStorage.setItem(STORAGE_KEY, result.token);
      setUnlocked(true);
    } else {
      setError(result.error || "Code incorrect");
      setCode("");
    }
  };

  if (checking) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0A0A0A" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: "#111111", border: "1.5px solid rgba(217,197,160,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(6,95,70,0.15)", border: "2px solid #D9C5A0" }}
        >
          <span style={{ fontSize: 28 }}>🔒</span>
        </div>
        <h1 className="text-xl font-black mb-1" style={{ color: "#D9C5A0" }}>
          BRIDGE MANAGER
        </h1>
        <p className="text-sm mb-6" style={{ color: "rgba(229,225,216,0.6)" }}>
          Entrez le code d'accès à 9 chiffres
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={9}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 9));
            setError("");
          }}
          placeholder="• • • • • • • • •"
          className="w-full text-center text-2xl font-black tracking-[0.3em] rounded-xl px-4 py-3 mb-4 outline-none"
          style={{ background: "#1a1a1a", color: "#fff", border: `1.5px solid ${error ? "#EF4444" : "rgba(217,197,160,0.3)"}` }}
          autoFocus
        />
        {error && (
          <p className="text-xs font-bold mb-4" style={{ color: "#EF4444" }}>
            ⚠️ {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || code.length !== 9}
          className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
          style={{ background: "#065F46", color: "#fff", cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Vérification…" : "Accéder au tableau de bord"}
        </button>
      </form>
    </div>
  );
}
