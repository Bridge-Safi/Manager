// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import { subscribeToPush, isPushSupported } from "../../lib/push";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
const GOLD = "#D4880C";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BROWN_LIGHT = "#9B7060";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export default function ChauffeurLogin() {
  const [, navigate] = useLocation();
  const { chauffeur, loginChauffeur } = useAuth();
  const { t } = useI18n();
  useEffect(() => {
    if (chauffeur) navigate("/chauffeur");
  }, [chauffeur]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Entrez votre adresse email");
      return;
    }
    if (!password) {
      setError("Entrez votre mot de passe");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role: "chauffeur" })
      });
      const data = await res.json();
      if (data.success) {
        loginChauffeur({ id: data.id, name: data.name, phone: data.phone, role: "chauffeur" });
        if (isPushSupported()) subscribeToPush({ driverId: data.id }).catch(() => {
        });
        navigate("/chauffeur");
      } else {
        setError(data.error || "Identifiants incorrects");
      }
    } catch {
      setError("Erreur de connexion. Réessayez.");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen flex flex-col items-center justify-center px-4 py-8", style: { backgroundColor: SAND }, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "fixed top-0 left-0 right-0 h-1", style: { backgroundImage: "repeating-linear-gradient(90deg,#C14B2A 0,#C14B2A 20px,#D4880C 20px,#D4880C 40px,#2A7A48 40px,#2A7A48 60px,#D4880C 60px,#D4880C 80px)" } }, void 0, false),
    /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-sm", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsxDEV("img", { src: "/bridge-logo.png", alt: "Bridge", className: "w-20 h-20 object-contain drop-shadow-xl mb-3" }, void 0, false),
        /* @__PURE__ */ jsxDEV("h1", { className: "text-2xl font-bold", style: { color: BROWN }, children: t("chauffeur_title") }, void 0, false),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-1", style: { color: BROWN_LIGHT }, children: "Connectez-vous à votre espace" }, void 0, false)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden mb-4", style: { background: "white", borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 flex items-center gap-3", style: { background: "#FEF6E4" }, children: [
            /* @__PURE__ */ jsxDEV(Mail, { className: "h-4 w-4 flex-shrink-0", style: { color: GOLD } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold uppercase tracking-wide", style: { color: BROWN_MID }, children: "Adresse email" }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "px-4", children: /* @__PURE__ */ jsxDEV(
            "input",
            {
              type: "email",
              inputMode: "email",
              autoComplete: "email",
              autoFocus: true,
              placeholder: "exemple@email.com",
              value: email,
              onChange: (e) => {
                setEmail(e.target.value);
                setError("");
              },
              onKeyDown: (e) => e.key === "Enter" && handleSubmit(),
              className: "w-full text-base outline-none py-3 bg-transparent",
              style: { color: BROWN }
            },
            void 0,
            false
          ) }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 flex items-center gap-3", style: { background: "#FEF6E4" }, children: [
            /* @__PURE__ */ jsxDEV(Lock, { className: "h-4 w-4 flex-shrink-0", style: { color: GOLD } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-semibold uppercase tracking-wide", style: { color: BROWN_MID }, children: "Mot de passe" }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "px-4 flex items-center", children: [
            /* @__PURE__ */ jsxDEV(
              "input",
              {
                type: showPassword ? "text" : "password",
                autoComplete: "current-password",
                placeholder: "••••••••",
                value: password,
                onChange: (e) => {
                  setPassword(e.target.value);
                  setError("");
                },
                onKeyDown: (e) => e.key === "Enter" && handleSubmit(),
                className: "flex-1 text-base outline-none py-3 bg-transparent",
                style: { color: BROWN }
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV("button", { onClick: () => setShowPassword((v) => !v), className: "p-1", style: { color: BROWN_LIGHT }, children: showPassword ? /* @__PURE__ */ jsxDEV(EyeOff, { className: "h-4 w-4" }, void 0, false) : /* @__PURE__ */ jsxDEV(Eye, { className: "h-4 w-4" }, void 0, false) }, void 0, false)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true),
      error && /* @__PURE__ */ jsxDEV("p", { className: "text-center text-sm font-medium mb-4 px-2", style: { color: GOLD }, children: error }, void 0, false),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: handleSubmit,
          disabled: loading || !email.trim() || !password,
          className: "w-full h-14 rounded-2xl font-bold text-lg text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2",
          style: { background: GOLD },
          children: loading ? /* @__PURE__ */ jsxDEV("span", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }, void 0, false),
            "Connexion…"
          ] }, void 0, true) : "Se connecter"
        },
        void 0,
        false
      ),
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          onClick: () => navigate("/"),
          className: "mt-6 w-full text-sm py-3 flex items-center justify-center gap-2",
          style: { color: BROWN_LIGHT },
          children: [
            /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "h-4 w-4" }, void 0, false),
            t("login_back_home")
          ]
        },
        void 0,
        true
      )
    ] }, void 0, true)
  ] }, void 0, true);
}
