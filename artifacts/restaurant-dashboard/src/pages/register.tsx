import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const PLATFORMS = [
  { value: "eats", label: "🍔 Eats (Restaurant / Snack)" },
  { value: "tabac", label: "🚬 Tabac" },
  { value: "pharmacie", label: "💊 Pharmacie" },
  { value: "boulangerie", label: "🥐 Boulangerie" },
  { value: "souk", label: "🛍️ Souk" },
  { value: "supermarche", label: "🛒 Supermarché" },
  { value: "fleurs", label: "🌸 Fleurs" },
];

export default function Register() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    platform: "eats",
    address: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        platform: form.platform,
        address: form.address.trim(),
        phone: form.phone.trim(),
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center mb-4 shadow-lg shadow-orange-200/60">
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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Créer un compte</h1>
          <p className="text-sm text-gray-500 mt-1">Rejoignez la plateforme Bridge</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nom du commerce *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="Ex: Snack Al Amal"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Platform */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Type de commerce *
            </label>
            <select
              value={form.platform}
              onChange={set("platform")}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors bg-white"
            >
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Adresse email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Téléphone *
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="Ex: 0600000000"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Adresse *
            </label>
            <input
              type="text"
              value={form.address}
              onChange={set("address")}
              placeholder="Ex: Rue Mohammed V, Safi"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Mot de passe *
            </label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Minimum 6 caractères"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="Répétez le mot de passe"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#FF6B35] text-white font-semibold text-sm hover:bg-[#E04E1A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mt-2"
          >
            {loading ? "Inscription en cours..." : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà inscrit ?{" "}
          <a href="./login" className="text-[#FF6B35] font-semibold hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
