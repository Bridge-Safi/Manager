import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Car, Package, ChevronRight, CheckCircle2, Phone, MapPin, User, FileText, Zap, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useCreateTrip, useCreateDelivery, useCancelTripByClient, useGetTrip, getGetTripQueryKey } from "@workspace/api-client-react";

const TC = "#E85C30";
const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const SAND = "#FAF6EF";
const BORDER = "#E8DDD0";
const BROWN = "#2C1810";
const BROWN_MID = "#6B4033";

type ServiceType = "taxi" | "livraison";

const BUSINESSES = [
  { id: "bridge", label: "Bridge Restaurant", icon: "🍽️", address: "Bridge, Safi" },
  { id: "tabac", label: "Tabac", icon: "🚬", address: "Tabac, Safi" },
  { id: "fleurs", label: "Fleurs", icon: "💐", address: "Fleurs, Safi" },
  { id: "pharmacie", label: "Pharmacie", icon: "💊", address: "Pharmacie, Safi" },
];

function generateTracking() {
  return "BRG-" + Date.now().toString(36).toUpperCase();
}

export default function CommandePage() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const [service, setService] = useState<ServiceType | null>(null);
  const [done, setDone] = useState(false);
  const [doneType, setDoneType] = useState<ServiceType>("taxi");
  const [confirmCode, setConfirmCode] = useState<string | null>(null);
  const [tripId, setTripId] = useState<number | null>(null);

  const createTrip = useCreateTrip();
  const createDelivery = useCreateDelivery();
  const cancelTrip = useCancelTripByClient();

  // Poll trip status every 5s while on the done screen for taxi
  const { data: tripStatus } = useGetTrip(tripId ?? 0, {
    query: {
      enabled: done && doneType === "taxi" && tripId !== null,
      queryKey: getGetTripQueryKey(tripId ?? 0),
      refetchInterval: 5000,
    },
  });
  const tripAccepted = tripStatus?.status !== undefined && tripStatus.status !== "scheduled";

  // Taxi form state
  const [taxi, setTaxi] = useState({
    passengerName: "",
    passengerPhone: "",
    pickupAddress: "",
    dropoffAddress: "",
    fare: "",
  });

  // Livraison form state
  const [livraison, setLivraison] = useState({
    customerName: "",
    customerPhone: "",
    businessId: "",
    deliveryAddress: "",
    notes: "",
    priority: "normal" as "normal" | "urgent",
  });

  const selectedBusiness = BUSINESSES.find(b => b.id === livraison.businessId);

  const submitTaxi = async () => {
    if (!taxi.passengerName || !taxi.pickupAddress || !taxi.dropoffAddress || !taxi.fare) return;
    createTrip.mutate(
      {
        data: {
          passengerName: taxi.passengerName,
          passengerPhone: taxi.passengerPhone || undefined,
          pickupAddress: taxi.pickupAddress,
          dropoffAddress: taxi.dropoffAddress,
          fare: parseFloat(taxi.fare),
        },
      },
      {
        onSuccess: (data) => {
          setTripId(data.id);
          setDoneType("taxi");
          setDone(true);
        },
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
          customerPhone: livraison.customerPhone || undefined,
          pickupAddress: selectedBusiness?.address ?? livraison.businessId,
          deliveryAddress: livraison.deliveryAddress,
          notes: livraison.notes || undefined,
          priority: livraison.priority,
        },
      },
      {
        onSuccess: (data) => {
          setConfirmCode(data.confirmCode ?? null);
          setDoneType("livraison");
          setDone(true);
        },
      }
    );
  };

  // Success screen
  if (done) {
    const isTaxi = doneType === "taxi";
    const accent = isTaxi ? GOLD : GREEN;
    const accentBg = isTaxi ? "#FEF6E4" : "#E4F5EC";
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: colors.bg }}
      >
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden border shadow-lg"
          style={{ background: colors.bgCard, borderColor: BORDER }}
        >
          {/* Top bar */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${isTaxi ? TC : GOLD})` }} />

          <div className="p-8 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm"
              style={{ background: accentBg }}
            >
              <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: BROWN }}>
              {isTaxi ? "🚖 Course envoyée !" : "📦 Commande envoyée !"}
            </h2>
            <p className="text-sm mb-5" style={{ color: BROWN_MID }}>
              {isTaxi
                ? "Les chauffeurs disponibles reçoivent l'alerte. Réponse dans 5 minutes."
                : "Les livreurs disponibles reçoivent l'alerte. Réponse dans 5 minutes."}
            </p>

        

            {/* Status badge for taxi — shows if a driver accepted */}
            {isTaxi && tripStatus && (
              <div
                className="rounded-xl px-4 py-2.5 mb-2 flex items-center gap-2 text-sm font-semibold"
                style={{
                  background: tripAccepted ? "rgba(42,122,72,0.12)" : "rgba(212,136,12,0.12)",
                  border: `1px solid ${tripAccepted ? "rgba(42,122,72,0.3)" : "rgba(212,136,12,0.3)"}`,
                  color: tripAccepted ? "#2A7A48" : GOLD,
                }}
              >
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: tripAccepted ? "#2A7A48" : GOLD }} />
                {tripAccepted ? "✓ Course acceptée par un chauffeur" : "En attente d'un chauffeur…"}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setDone(false);
                  setService(null);
                  setConfirmCode(null);
                  setTripId(null);
                  setTaxi({ passengerName: "", passengerPhone: "", pickupAddress: "", dropoffAddress: "", fare: "" });
                  setLivraison({ customerName: "", customerPhone: "", businessId: "", deliveryAddress: "", notes: "", priority: "normal" });
                }}
                className="w-full py-3 rounded-xl font-bold text-white transition-all"
                style={{ background: accent }}
              >
                Nouvelle commande
              </button>

              {/* Cancel button — visible only while trip is still pending (not yet accepted) */}
              {isTaxi && tripId !== null && !tripAccepted && (
                <button
                  onClick={() => {
                    if (!tripId) return;
                    cancelTrip.mutate({ id: tripId }, {
                      onSuccess: () => {
                        setDone(false);
                        setService(null);
                        setTripId(null);
                        setTaxi({ passengerName: "", passengerPhone: "", pickupAddress: "", dropoffAddress: "", fare: "" });
                      },
                    });
                  }}
                  disabled={cancelTrip.isPending}
                  className="w-full py-3 rounded-xl font-semibold border flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ borderColor: "#E53E3E", color: "#E53E3E", background: "rgba(229,62,62,0.08)" }}
                >
                  <X className="h-4 w-4" />
                  {cancelTrip.isPending ? "Annulation…" : "Annuler la course"}
                </button>
              )}

              <Link href="/">
                <button
                  className="w-full py-3 rounded-xl font-semibold border transition-all"
                  style={{ borderColor: BORDER, color: BROWN_MID, background: "transparent" }}
                >
                  Retour à l'accueil
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: colors.bg }}>

      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-4 flex items-center gap-3 border-b"
        style={{ background: TC, borderColor: "rgba(0,0,0,0.15)" }}
      >
        <Link href="/">
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
        </Link>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Passer une commande</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>Bridge — Safi, Maroc</p>
        </div>
      </div>

      {/* Zellige stripe */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg,#D4880C 0,#D4880C 20px,#C14B2A 20px,#C14B2A 40px,#2A7A48 40px,#2A7A48 60px,#C14B2A 60px,#C14B2A 80px)",
          opacity: 0.8,
        }}
      />

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Service selector */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: BROWN_MID }}>
            Type de service
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Taxi */}
            <button
              onClick={() => setService("taxi")}
              className="relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all"
              style={{
                borderColor: service === "taxi" ? GOLD : (isDark ? "#3A2A20" : BORDER),
                background: service === "taxi" ? (isDark ? "#2A1A0A" : "#FEF6E4") : colors.bgCard,
              }}
            >
              {service === "taxi" && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: GOLD }}
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: service === "taxi" ? GOLD + "20" : (isDark ? "#2A2010" : "#FAF6EF") }}
              >
                <Car className="h-6 w-6" style={{ color: GOLD }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: service === "taxi" ? GOLD : colors.text }}>Taxi Confort</p>
                <p className="text-[10px] mt-0.5" style={{ color: colors.textLight }}>Course privée</p>
              </div>
            </button>

            {/* Livraison */}
            <button
              onClick={() => setService("livraison")}
              className="relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all"
              style={{
                borderColor: service === "livraison" ? GREEN : (isDark ? "#1A3025" : BORDER),
                background: service === "livraison" ? (isDark ? "#0A2015" : "#E4F5EC") : colors.bgCard,
              }}
            >
              {service === "livraison" && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: GREEN }}
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: service === "livraison" ? GREEN + "20" : (isDark ? "#102010" : "#F0FAF4") }}
              >
                <Package className="h-6 w-6" style={{ color: GREEN }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: service === "livraison" ? GREEN : colors.text }}>Livraison</p>
                <p className="text-[10px] mt-0.5" style={{ color: colors.textLight }}>Repas & courses</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── TAXI FORM ── */}
        {service === "taxi" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: GOLD + "40", background: colors.bgCard }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, background: isDark ? "#2A1A0A" : "#FEF6E4" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
                  🚖 Détails de la course
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: BORDER }}>
                <Field icon={<User className="h-4 w-4" style={{ color: GOLD }} />} label="Nom du client *">
                  <input
                    type="text"
                    value={taxi.passengerName}
                    onChange={e => setTaxi(p => ({ ...p, passengerName: e.target.value }))}
                    placeholder="Ex: Mohammed Alami"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<Phone className="h-4 w-4" style={{ color: GOLD }} />} label="Téléphone">
                  <input
                    type="tel"
                    value={taxi.passengerPhone}
                    onChange={e => setTaxi(p => ({ ...p, passengerPhone: e.target.value }))}
                    placeholder="06 00 00 00 00"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<MapPin className="h-4 w-4" style={{ color: GOLD }} />} label="Départ *">
                  <input
                    type="text"
                    value={taxi.pickupAddress}
                    onChange={e => setTaxi(p => ({ ...p, pickupAddress: e.target.value }))}
                    placeholder="Adresse de prise en charge"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<MapPin className="h-4 w-4" style={{ color: GREEN }} />} label="Destination *">
                  <input
                    type="text"
                    value={taxi.dropoffAddress}
                    onChange={e => setTaxi(p => ({ ...p, dropoffAddress: e.target.value }))}
                    placeholder="Adresse de destination"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<span className="text-sm font-bold" style={{ color: GOLD }}>DH</span>} label="Tarif *">
                  <input
                    type="number"
                    value={taxi.fare}
                    onChange={e => setTaxi(p => ({ ...p, fare: e.target.value }))}
                    placeholder="35"
                    min="0"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
              </div>
            </div>

            <button
              onClick={submitTaxi}
              disabled={createTrip.isPending || !taxi.passengerName || !taxi.pickupAddress || !taxi.dropoffAddress || !taxi.fare}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: GOLD }}
            >
              {createTrip.isPending ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Car className="h-5 w-5" />
                  Envoyer aux chauffeurs
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── LIVRAISON FORM ── */}
        {service === "livraison" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">

            {/* Business selector */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BROWN_MID }}>
                Chez qui commander ? *
              </p>
              <div className="grid grid-cols-2 gap-2">
                {BUSINESSES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setLivraison(p => ({ ...p, businessId: b.id }))}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: livraison.businessId === b.id ? GREEN : (isDark ? "#1A3025" : BORDER),
                      background: livraison.businessId === b.id ? (isDark ? "#0A2015" : "#E4F5EC") : colors.bgCard,
                    }}
                  >
                    <span className="text-xl">{b.icon}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: livraison.businessId === b.id ? GREEN : colors.text }}
                    >
                      {b.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: BROWN_MID }}>
                Priorité
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLivraison(p => ({ ...p, priority: "normal" }))}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all"
                  style={{
                    borderColor: livraison.priority === "normal" ? GREEN : BORDER,
                    background: livraison.priority === "normal" ? (isDark ? "#0A2015" : "#E4F5EC") : colors.bgCard,
                    color: livraison.priority === "normal" ? GREEN : colors.textMid,
                  }}
                >
                  Normal
                </button>
                <button
                  onClick={() => setLivraison(p => ({ ...p, priority: "urgent" }))}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all flex items-center justify-center gap-1"
                  style={{
                    borderColor: livraison.priority === "urgent" ? TC : BORDER,
                    background: livraison.priority === "urgent" ? (isDark ? "#2A0A0A" : "#FDEEE9") : colors.bgCard,
                    color: livraison.priority === "urgent" ? TC : colors.textMid,
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Urgent
                </button>
              </div>
            </div>

            {/* Client info */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: GREEN + "40", background: colors.bgCard }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: BORDER, background: isDark ? "#0A2015" : "#E4F5EC" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GREEN }}>
                  📦 Détails de la livraison
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: BORDER }}>
                <Field icon={<User className="h-4 w-4" style={{ color: GREEN }} />} label="Nom du client *">
                  <input
                    type="text"
                    value={livraison.customerName}
                    onChange={e => setLivraison(p => ({ ...p, customerName: e.target.value }))}
                    placeholder="Ex: Fatima Zahra"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<Phone className="h-4 w-4" style={{ color: GREEN }} />} label="Téléphone">
                  <input
                    type="tel"
                    value={livraison.customerPhone}
                    onChange={e => setLivraison(p => ({ ...p, customerPhone: e.target.value }))}
                    placeholder="06 00 00 00 00"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<MapPin className="h-4 w-4" style={{ color: GREEN }} />} label="Adresse de livraison *">
                  <input
                    type="text"
                    value={livraison.deliveryAddress}
                    onChange={e => setLivraison(p => ({ ...p, deliveryAddress: e.target.value }))}
                    placeholder="Rue, quartier, Safi"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
                <Field icon={<FileText className="h-4 w-4" style={{ color: GREEN }} />} label="Note / Articles">
                  <input
                    type="text"
                    value={livraison.notes}
                    onChange={e => setLivraison(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Détail de la commande…"
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: colors.text }}
                  />
                </Field>
              </div>
            </div>

            <button
              onClick={submitLivraison}
              disabled={createDelivery.isPending || !livraison.customerName || !livraison.businessId || !livraison.deliveryAddress}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: GREEN }}
            >
              {createDelivery.isPending ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Package className="h-5 w-5" />
                  Envoyer aux livreurs
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Tip when no service selected */}
        {!service && (
          <div
            className="rounded-2xl p-5 text-center border"
            style={{ borderColor: BORDER, background: colors.bgCard }}
          >
            <p className="text-2xl mb-2">👆</p>
            <p className="text-sm font-semibold" style={{ color: BROWN_MID }}>
              Choisissez un service ci-dessus
            </p>
            <p className="text-xs mt-1" style={{ color: colors.textLight }}>
              Taxi Confort → chauffeurs · Livraison → livreurs
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textLight }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
