import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { subscribeToPush, isPushSupported } from "@/lib/push";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";

const GREEN = "#2A7A48";
const TC = "#E85C30";
const BROWN = "rgba(255,255,255,0.95)";
const BROWN_MID = "rgba(255,255,255,0.65)";
const BROWN_LIGHT = "rgba(255,255,255,0.40)";
const BORDER = "rgba(255,255,255,0.15)";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function MotoLogin() {
  const [, navigate] = useLocation();
  const { chauffeur, loginChauffeur } = useAuth();

  useEffect(() => {
    if (chauffeur) navigate(chauffeur.vehicleType === "moto" ? "/moto" : "/chauffeur");
  }, [chauffeur]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { setError("Entrez votre adresse email"); return; }
    if (!password) { setError("Entrez votre mot de passe"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role: "chauffeur" }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.vehicleType !== "moto") {
          setError("Ce compte n'est pas un compte Moto Chauffeur.");
          setLoading(false);
          return;
        }
        loginChauffeur({ id: data.id, name: data.name, phone: data.phone, role: "chauffeur", vehicleType: "moto" });
        if (isPushSupported()) subscribeToPush({ driverId: data.id }).catch(() => {});
        navigate("/moto");
      } else {
        setError(data.error || "Identifiants incorrects");
      }
    } catch {
      setError("Erreur de connexion. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#1A0A06" }}>
      {/* Green gradient header */}
      <div
        className="relative pt-14 pb-20 flex flex-col items-center overflow-hidden"
        style={{ background: "linear-gradient(135deg, #2A7A48 0%, #1A5C33 100%)", borderRadius: "0 0 32px 32px" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.10, backgroundImage:`url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l2 18 18 2-18 2-2 18-2-18-18-2 18-2z' fill='%23ffffff' fill-rule='evenodd'/%3E%3C/svg%3E")`, backgroundSize:"40px 40px" }} />
        <img src="/bridge-logo.png" alt="Bridge" className="w-20 h-20 mx-auto object-contain mb-3 relative z-10" />
        <h1 className="text-2xl font-black text-white relative z-10">🛵 Moto Chauffeur</h1>
        <p className="text-sm mt-1 text-white/70 relative z-10">Bridge Scooter — Connectez-vous</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-6 pb-8">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: `1px solid ${BORDER}` }}>
            {/* Email */}
            <div className="border-b" style={{ borderColor: BORDER }}>
              <div className="px-4 py-2 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <Mail className="h-4 w-4 flex-shrink-0" style={{ color: GREEN }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: BROWN_MID }}>Adresse email</span>
              </div>
              <div className="px-4">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  className="w-full text-base outline-none py-3 bg-transparent placeholder:text-slate-300"
                  style={{ color: BROWN }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="px-4 py-2 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.06)" }}>
                <Lock className="h-4 w-4 flex-shrink-0" style={{ color: GREEN }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: BROWN_MID }}>Mot de passe</span>
              </div>
              <div className="px-4 flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  className="flex-1 text-base outline-none py-3 bg-transparent placeholder:text-slate-300"
                  style={{ color: BROWN }}
                />
                <button onClick={() => setShowPassword(v => !v)} className="p-1" style={{ color: BROWN_LIGHT }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-center text-sm font-semibold mb-4 px-2" style={{ color: TC }}>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password}
            className="w-full h-14 rounded-2xl font-black text-lg text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2A7A48 0%, #1A5C33 100%)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connexion…
              </span>
            ) : "Se connecter — Bridge Scooter"}
          </button>

          <button
            onClick={() => navigate("/")}
            className="mt-4 w-full text-sm py-3 flex items-center justify-center gap-2"
            style={{ color: BROWN_LIGHT }}
          >
            <ArrowLeft className="h-4 w-4" />
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
