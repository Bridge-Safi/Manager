// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Car, Package, ChevronRight, CheckCircle2, Phone, MapPin, User, FileText, Zap } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { useCreateTrip, useCreateDelivery } from "@workspace/api-client-react";
const TC = "#C14B2A";
const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";
const BUSINESSES = [
  { id: "bridge", label: "Bridge Restaurant", icon: "🍽️", address: "Bridge, Safi" },
  { id: "tabac", label: "Tabac", icon: "🚬", address: "Tabac, Safi" },
  { id: "fleurs", label: "Fleurs", icon: "💐", address: "Fleurs, Safi" },
  { id: "pharmacie", label: "Pharmacie", icon: "💊", address: "Pharmacie, Safi" }
];
function generateTracking() {
  return "BRG-" + Date.now().toString(36).toUpperCase();
}
export default function CommandePage() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const [service, setService] = useState(null);
  const [done, setDone] = useState(false);
  const [doneType, setDoneType] = useState("taxi");
  const [confirmCode, setConfirmCode] = useState(null);
  const createTrip = useCreateTrip();
  const createDelivery = useCreateDelivery();
  const [taxi, setTaxi] = useState({
    passengerName: "",
    passengerPhone: "",
    pickupAddress: "",
    dropoffAddress: "",
    fare: ""
  });
  const [livraison, setLivraison] = useState({
    customerName: "",
    customerPhone: "",
    businessId: "",
    deliveryAddress: "",
    notes: "",
    priority: "normal"
  });
  const selectedBusiness = BUSINESSES.find((b) => b.id === livraison.businessId);
  const submitTaxi = async () => {
    if (!taxi.passengerName || !taxi.pickupAddress || !taxi.dropoffAddress || !taxi.fare) return;
    createTrip.mutate(
      {
        data: {
          passengerName: taxi.passengerName,
          passengerPhone: taxi.passengerPhone || void 0,
          pickupAddress: taxi.pickupAddress,
          dropoffAddress: taxi.dropoffAddress,
          fare: parseFloat(taxi.fare)
        }
      },
      {
        onSuccess: () => {
          setDoneType("taxi");
          setDone(true);
        }
      }
    );
  };
  const submitLivraison = async () => {
    if (!livraison.customerName || !livraison.businessId || !livraison.deliveryAddress) return;
    createDelivery.mutate(
      {
        data: {
          trackingNumber: generateTracking(),
          customerName: livraison.customerName,
          customerPhone: livraison.customerPhone || void 0,
          pickupAddress: selectedBusiness?.address ?? livraison.businessId,
          deliveryAddress: livraison.deliveryAddress,
          notes: livraison.notes || void 0,
          priority: livraison.priority
        }
      },
      {
        onSuccess: (data) => {
          setConfirmCode(data.confirmCode ?? null);
          setDoneType("livraison");
          setDone(true);
        }
      }
    );
  };
  if (done) {
    const isTaxi = doneType === "taxi";
    const accent = isTaxi ? GOLD : GREEN;
    const accentBg = isTaxi ? "#FEF6E4" : "#E4F5EC";
    return /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "min-h-screen flex flex-col items-center justify-center px-4 py-12",
        style: { background: colors.bg },
        children: /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "w-full max-w-sm rounded-2xl overflow-hidden border shadow-lg",
            style: { background: colors.bgCard, borderColor: BORDER },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "h-1.5 w-full", style: { background: `linear-gradient(90deg, ${accent}, ${isTaxi ? TC : GOLD})` } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "p-8 text-center", children: [
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm",
                    style: { background: accentBg },
                    children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-10 w-10", style: { color: accent } }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-bold mb-2", style: { color: BROWN }, children: isTaxi ? "🚖 Course envoyée !" : "📦 Commande envoyée !" }, void 0, false),
                /* @__PURE__ */ jsxDEV("p", { className: "text-sm mb-5", style: { color: BROWN_MID }, children: isTaxi ? "Les chauffeurs disponibles reçoivent l'alerte. Réponse dans 5 minutes." : "Les livreurs disponibles reçoivent l'alerte. Réponse dans 5 minutes." }, void 0, false),
                !isTaxi && confirmCode && /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "rounded-2xl border mb-5 overflow-hidden",
                    style: { borderColor: GREEN + "60", background: "#E4F5EC" },
                    children: [
                      /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-2 border-b", style: { borderColor: GREEN + "30", background: GREEN + "15" }, children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest", style: { color: GREEN }, children: "🔐 Code de confirmation client" }, void 0, false) }, void 0, false),
                      /* @__PURE__ */ jsxDEV("div", { className: "py-4", children: [
                        /* @__PURE__ */ jsxDEV(
                          "div",
                          {
                            className: "text-5xl font-mono font-extrabold tracking-[0.35em] mx-auto",
                            style: { color: GREEN },
                            children: confirmCode
                          },
                          void 0,
                          false
                        ),
                        /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-3 px-4", style: { color: "#2A5C38" }, children: "Donnez ce code au livreur à la livraison. Il doit le saisir pour valider." }, void 0, false)
                      ] }, void 0, true)
                    ]
                  },
                  void 0,
                  true
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col gap-3", children: [
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      onClick: () => {
                        setDone(false);
                        setService(null);
                        setConfirmCode(null);
                        setTaxi({ passengerName: "", passengerPhone: "", pickupAddress: "", dropoffAddress: "", fare: "" });
                        setLivraison({ customerName: "", customerPhone: "", businessId: "", deliveryAddress: "", notes: "", priority: "normal" });
                      },
                      className: "w-full py-3 rounded-xl font-bold text-white transition-all",
                      style: { background: accent },
                      children: "Nouvelle commande"
                    },
                    void 0,
                    false
                  ),
                  /* @__PURE__ */ jsxDEV(Link, { href: "/", children: /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      className: "w-full py-3 rounded-xl font-semibold border transition-all",
                      style: { borderColor: BORDER, color: BROWN_MID, background: "transparent" },
                      children: "Retour à l'accueil"
                    },
                    void 0,
                    false
                  ) }, void 0, false)
                ] }, void 0, true)
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        )
      },
      void 0,
      false
    );
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen flex flex-col", style: { background: colors.bg }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "sticky top-0 z-20 px-4 py-4 flex items-center gap-3 border-b",
        style: { background: TC, borderColor: "rgba(0,0,0,0.15)" },
        children: [
          /* @__PURE__ */ jsxDEV(Link, { href: "/", children: /* @__PURE__ */ jsxDEV("button", { className: "w-9 h-9 rounded-full flex items-center justify-center", style: { background: "rgba(255,255,255,0.15)" }, children: /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "h-5 w-5 text-white" }, void 0, false) }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("h1", { className: "text-base font-bold text-white tracking-tight", children: "Passer une commande" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: "rgba(255,255,255,0.7)" }, children: "Bridge — Safi, Maroc" }, void 0, false)
          ] }, void 0, true)
        ]
      },
      void 0,
      true
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "h-1 w-full flex-shrink-0",
        style: {
          backgroundImage: "repeating-linear-gradient(90deg,#D4880C 0,#D4880C 20px,#C14B2A 20px,#C14B2A 40px,#2A7A48 40px,#2A7A48 60px,#C14B2A 60px,#C14B2A 80px)",
          opacity: 0.8
        }
      },
      void 0,
      false
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest mb-3", style: { color: BROWN_MID }, children: "Type de service" }, void 0, false),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setService("taxi"),
              className: "relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
              style: {
                borderColor: service === "taxi" ? GOLD : isDark ? "#3A2A20" : BORDER,
                background: service === "taxi" ? isDark ? "#2A1A0A" : "#FEF6E4" : colors.bgCard
              },
              children: [
                service === "taxi" && /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                    style: { background: GOLD },
                    children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-3 w-3 text-white" }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-12 h-12 rounded-2xl flex items-center justify-center",
                    style: { background: service === "taxi" ? GOLD + "20" : isDark ? "#2A2010" : "#FAF6EF" },
                    children: /* @__PURE__ */ jsxDEV(Car, { className: "h-6 w-6", style: { color: GOLD } }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
                  /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: service === "taxi" ? GOLD : colors.text }, children: "Taxi Confort" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] mt-0.5", style: { color: colors.textLight }, children: "Course privée" }, void 0, false)
                ] }, void 0, true)
              ]
            },
            void 0,
            true
          ),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              onClick: () => setService("livraison"),
              className: "relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all",
              style: {
                borderColor: service === "livraison" ? GREEN : isDark ? "#1A3025" : BORDER,
                background: service === "livraison" ? isDark ? "#0A2015" : "#E4F5EC" : colors.bgCard
              },
              children: [
                service === "livraison" && /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center",
                    style: { background: GREEN },
                    children: /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-3 w-3 text-white" }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV(
                  "div",
                  {
                    className: "w-12 h-12 rounded-2xl flex items-center justify-center",
                    style: { background: service === "livraison" ? GREEN + "20" : isDark ? "#102010" : "#F0FAF4" },
                    children: /* @__PURE__ */ jsxDEV(Package, { className: "h-6 w-6", style: { color: GREEN } }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV("div", { className: "text-center", children: [
                  /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-bold", style: { color: service === "livraison" ? GREEN : colors.text }, children: "Livraison" }, void 0, false),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] mt-0.5", style: { color: colors.textLight }, children: "Repas & courses" }, void 0, false)
                ] }, void 0, true)
              ]
            },
            void 0,
            true
          )
        ] }, void 0, true)
      ] }, void 0, true),
      service === "taxi" && /* @__PURE__ */ jsxDEV("div", { className: "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200", children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-2xl border overflow-hidden",
            style: { borderColor: GOLD + "40", background: colors.bgCard },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 border-b", style: { borderColor: BORDER, background: isDark ? "#2A1A0A" : "#FEF6E4" }, children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest", style: { color: GOLD }, children: "🚖 Détails de la course" }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "divide-y", style: { borderColor: BORDER }, children: [
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(User, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false), label: "Nom du client *", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    value: taxi.passengerName,
                    onChange: (e) => setTaxi((p) => ({ ...p, passengerName: e.target.value })),
                    placeholder: "Ex: Mohammed Alami",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(Phone, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false), label: "Téléphone", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "tel",
                    value: taxi.passengerPhone,
                    onChange: (e) => setTaxi((p) => ({ ...p, passengerPhone: e.target.value })),
                    placeholder: "06 00 00 00 00",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false), label: "Départ *", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    value: taxi.pickupAddress,
                    onChange: (e) => setTaxi((p) => ({ ...p, pickupAddress: e.target.value })),
                    placeholder: "Adresse de prise en charge",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false), label: "Destination *", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    value: taxi.dropoffAddress,
                    onChange: (e) => setTaxi((p) => ({ ...p, dropoffAddress: e.target.value })),
                    placeholder: "Adresse de destination",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: GOLD }, children: "DH" }, void 0, false), label: "Tarif *", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "number",
                    value: taxi.fare,
                    onChange: (e) => setTaxi((p) => ({ ...p, fare: e.target.value })),
                    placeholder: "35",
                    min: "0",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false)
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: submitTaxi,
            disabled: createTrip.isPending || !taxi.passengerName || !taxi.pickupAddress || !taxi.dropoffAddress || !taxi.fare,
            className: "w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40",
            style: { background: GOLD },
            children: createTrip.isPending ? /* @__PURE__ */ jsxDEV("span", { className: "animate-spin", children: "⏳" }, void 0, false) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(Car, { className: "h-5 w-5" }, void 0, false),
              "Envoyer aux chauffeurs",
              /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-5 w-5" }, void 0, false)
            ] }, void 0, true)
          },
          void 0,
          false
        )
      ] }, void 0, true),
      service === "livraison" && /* @__PURE__ */ jsxDEV("div", { className: "space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest mb-2", style: { color: BROWN_MID }, children: "Chez qui commander ? *" }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-2", children: BUSINESSES.map(
            (b) => /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setLivraison((p) => ({ ...p, businessId: b.id })),
                className: "flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all",
                style: {
                  borderColor: livraison.businessId === b.id ? GREEN : isDark ? "#1A3025" : BORDER,
                  background: livraison.businessId === b.id ? isDark ? "#0A2015" : "#E4F5EC" : colors.bgCard
                },
                children: [
                  /* @__PURE__ */ jsxDEV("span", { className: "text-xl", children: b.icon }, void 0, false),
                  /* @__PURE__ */ jsxDEV(
                    "span",
                    {
                      className: "text-sm font-semibold",
                      style: { color: livraison.businessId === b.id ? GREEN : colors.text },
                      children: b.label
                    },
                    void 0,
                    false
                  )
                ]
              },
              b.id,
              true
            )
          ) }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest mb-2", style: { color: BROWN_MID }, children: "Priorité" }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setLivraison((p) => ({ ...p, priority: "normal" })),
                className: "flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all",
                style: {
                  borderColor: livraison.priority === "normal" ? GREEN : BORDER,
                  background: livraison.priority === "normal" ? isDark ? "#0A2015" : "#E4F5EC" : colors.bgCard,
                  color: livraison.priority === "normal" ? GREEN : colors.textMid
                },
                children: "Normal"
              },
              void 0,
              false
            ),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: () => setLivraison((p) => ({ ...p, priority: "urgent" })),
                className: "flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-1",
                style: {
                  borderColor: livraison.priority === "urgent" ? TC : BORDER,
                  background: livraison.priority === "urgent" ? isDark ? "#2A0A0A" : "#FDEEE9" : colors.bgCard,
                  color: livraison.priority === "urgent" ? TC : colors.textMid
                },
                children: [
                  /* @__PURE__ */ jsxDEV(Zap, { className: "h-3.5 w-3.5" }, void 0, false),
                  "Urgent"
                ]
              },
              void 0,
              true
            )
          ] }, void 0, true)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "rounded-2xl border overflow-hidden",
            style: { borderColor: GREEN + "40", background: colors.bgCard },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 border-b", style: { borderColor: BORDER, background: isDark ? "#0A2015" : "#E4F5EC" }, children: /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-bold uppercase tracking-widest", style: { color: GREEN }, children: "📦 Détails de la livraison" }, void 0, false) }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "divide-y", style: { borderColor: BORDER }, children: [
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(User, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false), label: "Nom du client *", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    value: livraison.customerName,
                    onChange: (e) => setLivraison((p) => ({ ...p, customerName: e.target.value })),
                    placeholder: "Ex: Fatima Zahra",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(Phone, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false), label: "Téléphone", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "tel",
                    value: livraison.customerPhone,
                    onChange: (e) => setLivraison((p) => ({ ...p, customerPhone: e.target.value })),
                    placeholder: "06 00 00 00 00",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(MapPin, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false), label: "Adresse de livraison *", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    value: livraison.deliveryAddress,
                    onChange: (e) => setLivraison((p) => ({ ...p, deliveryAddress: e.target.value })),
                    placeholder: "Rue, quartier, Safi",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false),
                /* @__PURE__ */ jsxDEV(Field, { icon: /* @__PURE__ */ jsxDEV(FileText, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false), label: "Note / Articles", children: /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    type: "text",
                    value: livraison.notes,
                    onChange: (e) => setLivraison((p) => ({ ...p, notes: e.target.value })),
                    placeholder: "Détail de la commande…",
                    className: "w-full bg-transparent outline-none text-sm",
                    style: { color: colors.text }
                  },
                  void 0,
                  false
                ) }, void 0, false)
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        ),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: submitLivraison,
            disabled: createDelivery.isPending || !livraison.customerName || !livraison.businessId || !livraison.deliveryAddress,
            className: "w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40",
            style: { background: GREEN },
            children: createDelivery.isPending ? /* @__PURE__ */ jsxDEV("span", { className: "animate-spin", children: "⏳" }, void 0, false) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
              /* @__PURE__ */ jsxDEV(Package, { className: "h-5 w-5" }, void 0, false),
              "Envoyer aux livreurs",
              /* @__PURE__ */ jsxDEV(ChevronRight, { className: "h-5 w-5" }, void 0, false)
            ] }, void 0, true)
          },
          void 0,
          false
        )
      ] }, void 0, true),
      !service && /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: "rounded-2xl p-5 text-center border",
          style: { borderColor: BORDER, background: colors.bgCard },
          children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-2xl mb-2", children: "👆" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-semibold", style: { color: BROWN_MID }, children: "Choisissez un service ci-dessus" }, void 0, false),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs mt-1", style: { color: colors.textLight }, children: "Taxi Confort → chauffeurs · Livraison → livreurs" }, void 0, false)
          ]
        },
        void 0,
        true
      )
    ] }, void 0, true)
  ] }, void 0, true);
}
function Field({ icon, label, children }) {
  const { colors } = useTheme();
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-3 px-4 py-3.5", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "flex-shrink-0", children: icon }, void 0, false),
    /* @__PURE__ */ jsxDEV("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] font-semibold uppercase tracking-wide mb-1", style: { color: colors.textLight }, children: label }, void 0, false),
      children
    ] }, void 0, true)
  ] }, void 0, true);
}
