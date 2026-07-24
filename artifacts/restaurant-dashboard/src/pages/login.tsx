import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmail = identifier.trim().includes("@");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier.trim(), isEmail ? password : undefined);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center mb-5 shadow-lg shadow-orange-200/60">
            <svg width="28" height="28" viewBox="0 0 18 18" fill="none">
              <path d="M3 12 C3 7 15 7 15 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
              <line x1="3" y1="12" x2="3" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="15" y1="12" x2="15" y2="15" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="2" y1="15" x2="16" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
              <line x1="7.5" y1="3.5" x2="7.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="3.5" x2="9" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="10.5" y1="3.5" x2="10.5" y2="8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="8" x2="9" y2="11" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bridge Eats</h1>
          <p className="text-sm text-gray-500 mt-1">Tableau de bord restaurant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email ou numéro de téléphone
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="votre@email.com ou 0600000000"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
              data-testid="input-identifier"
            />
          </div>

          {isEmail && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
                data-testid="input-password"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !identifier.trim()}
            className="w-full py-3 rounded-xl bg-[#FF6B35] text-white font-semibold text-sm hover:bg-[#E04E1A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            data-testid="btn-login"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{" "}
          <a href="./register" className="text-[#FF6B35] font-semibold hover:underline">
            S'inscrire
          </a>
        </p>
      </div>
    </div>
  );
}
