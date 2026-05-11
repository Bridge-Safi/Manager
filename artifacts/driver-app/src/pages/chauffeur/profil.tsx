// @ts-nocheck
import { jsxDEV, Fragment } from "react/jsx-dev-runtime";
import { useState, useEffect } from "react";
import { ChauffeurLayout } from "../../components/layout/ChauffeurLayout";
import { useGetDriver, getGetDriverQueryKey, useUpdateDriver } from "@workspace/api-client-react";
import { Car, Star, Navigation, Settings, CheckCircle2, LogOut } from "lucide-react";
import { PhotoUpload } from "../../components/PhotoUpload";
import { Skeleton } from "../../components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
import { useI18n } from "../../lib/i18n";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { useLocation } from "wouter";
const GOLD = "#D4880C";
const GREEN = "#2A7A48";
const TC = "#C14B2A";
function StarRating({ value, textColor }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-0.5", children: [
    [1, 2, 3, 4, 5].map(
      (s) => /* @__PURE__ */ jsxDEV(
        Star,
        {
          className: "w-4 h-4",
          style: {
            fill: s <= Math.round(value) ? GOLD : "transparent",
            color: s <= Math.round(value) ? GOLD : "#E8DDD0"
          }
        },
        s,
        false
      )
    ),
    /* @__PURE__ */ jsxDEV("span", { className: "ml-1.5 text-sm font-bold", style: { color: textColor }, children: value.toFixed(1) }, void 0, false),
    /* @__PURE__ */ jsxDEV("span", { className: "text-xs ml-0.5", style: { color: textColor, opacity: 0.6 }, children: "/5" }, void 0, false)
  ] }, void 0, true);
}
export default function ChauffeurProfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useI18n();
  const { chauffeur, logoutChauffeur } = useAuth();
  const { colors } = useTheme();
  const [, navigate] = useLocation();
  const DRIVER_ID = chauffeur?.id ?? 0;
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("available");
  const BORDER = colors.border;
  const BROWN = colors.text;
  const BROWN_MID = colors.textMid;
  const BROWN_LIGHT = colors.textLight;
  const { data: profile, isLoading } = useGetDriver(DRIVER_ID, {
    query: { enabled: !!DRIVER_ID, queryKey: getGetDriverQueryKey(DRIVER_ID) }
  });
  const updateDriver = useUpdateDriver();
  useEffect(() => {
    if (profile) setEditStatus(profile.status);
  }, [profile]);
  const handleSave = () => {
    updateDriver.mutate(
      { id: DRIVER_ID, data: { status: editStatus } },
      {
        onSuccess: () => {
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetDriverQueryKey(DRIVER_ID) });
          toast({ title: t("profile_updated_title"), description: t("profile_updated_desc") });
        }
      }
    );
  };
  const handleLogout = () => {
    logoutChauffeur();
    navigate("/");
  };
  const STATUS_DISPLAY = {
    available: { label: t("status_online"), color: GREEN, bg: "#E4F5EC", dot: GREEN },
    busy: { label: t("status_busy_trip"), color: GOLD, bg: "#FEF6E4", dot: GOLD },
    offline: { label: t("status_offline"), color: BROWN_LIGHT, bg: colors.bgCardHover, dot: BROWN_LIGHT }
  };
  return /* @__PURE__ */ jsxDEV(ChauffeurLayout, { children: /* @__PURE__ */ jsxDEV("div", { className: "flex-1 overflow-auto animate-in fade-in duration-300", style: { background: colors.bg }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "h-1 w-full",
        style: { backgroundImage: "repeating-linear-gradient(90deg,#D4880C 0,#D4880C 20px,#C14B2A 20px,#C14B2A 40px,#2A7A48 40px,#2A7A48 60px,#C14B2A 60px,#C14B2A 80px)" }
      },
      void 0,
      false
    ),
    isLoading || !profile ? /* @__PURE__ */ jsxDEV("div", { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-48 w-full rounded-2xl", style: { background: colors.bgCard } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-32 w-full rounded-2xl", style: { background: colors.bgCard } }, void 0, false),
      /* @__PURE__ */ jsxDEV(Skeleton, { className: "h-32 w-full rounded-2xl", style: { background: colors.bgCard } }, void 0, false)
    ] }, void 0, true) : /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4 max-w-lg mx-auto", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl overflow-hidden border", style: { background: colors.bgCard, borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            className: "h-24 relative",
            style: { background: `linear-gradient(135deg, ${GOLD} 0%, #A86A08 60%, #5A3A04 100%)` },
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 opacity-10", style: {
                backgroundImage: "repeating-linear-gradient(45deg, #C14B2A 0, #C14B2A 2px, transparent 0, transparent 50%)",
                backgroundSize: "16px 16px"
              } }, void 0, false),
              /* @__PURE__ */ jsxDEV("div", { className: "absolute top-3 right-3 flex gap-2", children: [
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: () => isEditing ? handleSave() : setIsEditing(true),
                    disabled: updateDriver.isPending,
                    className: "w-8 h-8 rounded-full flex items-center justify-center",
                    style: { background: "rgba(255,255,255,0.25)" },
                    children: /* @__PURE__ */ jsxDEV(Settings, { className: "h-4 w-4 text-white" }, void 0, false)
                  },
                  void 0,
                  false
                ),
                /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    onClick: handleLogout,
                    className: "w-8 h-8 rounded-full flex items-center justify-center",
                    style: { background: "rgba(255,255,255,0.15)" },
                    children: /* @__PURE__ */ jsxDEV(LogOut, { className: "h-4 w-4 text-white" }, void 0, false)
                  },
                  void 0,
                  false
                )
              ] }, void 0, true)
            ]
          },
          void 0,
          true
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "px-5 pb-5 -mt-10 relative", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "mb-3", children: /* @__PURE__ */ jsxDEV(
            PhotoUpload,
            {
              currentPhotoUrl: profile.avatarUrl,
              uploading: updateDriver.isPending,
              size: 80,
              required: !profile.avatarUrl,
              onUpload: (dataUrl) => {
                updateDriver.mutate(
                  { id: DRIVER_ID, data: { avatarUrl: dataUrl } },
                  {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: getGetDriverQueryKey(DRIVER_ID) });
                      toast({ title: "Photo mise à jour ✓" });
                    }
                  }
                );
              }
            },
            void 0,
            false
          ) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("h2", { className: "text-xl font-bold", style: { color: BROWN }, children: profile.name }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm font-mono mt-0.5", style: { color: BROWN_LIGHT }, children: profile.phone }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-xl border", style: { background: "#FEF6E4", borderColor: "#F5D98A" }, children: [
              /* @__PURE__ */ jsxDEV(Star, { className: "h-4 w-4", style: { fill: GOLD, color: GOLD } }, void 0, false),
              /* @__PURE__ */ jsxDEV("span", { className: "text-base font-extrabold", style: { color: GOLD }, children: profile.rating.toFixed(1) }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "mt-3", children: /* @__PURE__ */ jsxDEV(StarRating, { value: profile.rating, textColor: BROWN }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "mt-4", children: isEditing ? /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold mb-2", style: { color: BROWN_LIGHT }, children: t("settings") }, void 0, false),
            /* @__PURE__ */ jsxDEV("div", { className: "flex gap-2 flex-wrap", children: ["available", "busy", "offline"].map((s) => {
              const cfg = STATUS_DISPLAY[s];
              const active = editStatus === s;
              return /* @__PURE__ */ jsxDEV(
                "button",
                {
                  onClick: () => setEditStatus(s),
                  className: "px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all",
                  style: {
                    background: active ? cfg.bg : colors.bgCard,
                    color: active ? cfg.color : BROWN_LIGHT,
                    borderColor: active ? cfg.color + "80" : BORDER
                  },
                  children: [
                    /* @__PURE__ */ jsxDEV("span", { className: "inline-block w-2 h-2 rounded-full mr-1.5", style: { background: cfg.dot } }, void 0, false),
                    cfg.label
                  ]
                },
                s,
                true
              );
            }) }, void 0, false),
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                onClick: handleSave,
                disabled: updateDriver.isPending,
                className: "mt-3 w-full py-2 rounded-xl font-bold text-sm text-white disabled:opacity-60",
                style: { background: GOLD },
                children: updateDriver.isPending ? "…" : t("save")
              },
              void 0,
              false
            )
          ] }, void 0, true) : /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "inline-block w-2.5 h-2.5 rounded-full", style: { background: STATUS_DISPLAY[profile.status]?.dot ?? BROWN_LIGHT } }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-medium", style: { color: STATUS_DISPLAY[profile.status]?.color ?? BROWN_LIGHT }, children: STATUS_DISPLAY[profile.status]?.label ?? profile.status }, void 0, false)
          ] }, void 0, true) }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-3 gap-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 text-center", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: GOLD }, children: profile.totalTrips }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("total_trips_label") }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 text-center", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: GREEN }, children: profile.rating.toFixed(1) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("rating_global") }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border p-4 text-center", style: { background: colors.bgCard, borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV("div", { className: "text-2xl font-bold", style: { color: TC }, children: "98%" }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "text-xs mt-1", style: { color: BROWN_LIGHT }, children: t("success_rate") }, void 0, false)
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(Car, { className: "h-4 w-4", style: { color: GOLD } }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: t("vehicle_license") }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-4 space-y-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-start justify-between gap-4", children: [
            /* @__PURE__ */ jsxDEV("div", { children: [
              /* @__PURE__ */ jsxDEV("h3", { className: "text-lg font-bold", style: { color: BROWN }, children: profile.vehicleModel }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-sm mt-0.5", style: { color: BROWN_LIGHT }, children: t("comfort_standard") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "px-3 py-1.5 rounded-xl border font-mono text-sm font-bold tracking-widest",
                style: { background: colors.bgCardHover, borderColor: BORDER, color: BROWN_MID },
                children: profile.vehiclePlate
              },
              void 0,
              false
            )
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "pt-3 border-t", style: { borderColor: BORDER }, children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs mb-1", style: { color: BROWN_LIGHT }, children: t("vtc_card") }, void 0, false),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: "px-3 py-2 rounded-xl border font-mono text-sm font-semibold inline-block",
                style: { background: colors.bgCardHover, borderColor: BORDER, color: BROWN_MID },
                children: profile.licenseNumber
              },
              void 0,
              false
            )
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true),
      /* @__PURE__ */ jsxDEV("div", { className: "rounded-2xl border overflow-hidden", style: { background: colors.bgCard, borderColor: BORDER }, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "px-4 py-3 flex items-center gap-2 border-b", style: { borderColor: BORDER }, children: [
          /* @__PURE__ */ jsxDEV(Navigation, { className: "h-4 w-4", style: { color: GREEN } }, void 0, false),
          /* @__PURE__ */ jsxDEV("span", { className: "text-sm font-bold", style: { color: BROWN }, children: t("stats") }, void 0, false)
        ] }, void 0, true),
        /* @__PURE__ */ jsxDEV("div", { className: "p-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-sm", style: { color: BROWN_LIGHT }, children: t("total_trips_label") }, void 0, false),
            /* @__PURE__ */ jsxDEV("span", { className: "text-2xl font-bold", style: { color: BROWN }, children: profile.totalTrips }, void 0, false)
          ] }, void 0, true),
          /* @__PURE__ */ jsxDEV("div", { className: "h-2 w-full rounded-full overflow-hidden", style: { background: colors.bgCardHover }, children: /* @__PURE__ */ jsxDEV("div", { className: "h-full rounded-full", style: { width: "100%", background: `linear-gradient(90deg, ${GOLD}, ${TC})` } }, void 0, false) }, void 0, false),
          /* @__PURE__ */ jsxDEV("div", { className: "mt-3 grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "p-3 rounded-xl border text-center", style: { background: colors.bgCardHover, borderColor: BORDER }, children: [
              /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-5 w-5 mx-auto mb-1", style: { color: GREEN } }, void 0, false),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs font-semibold", style: { color: BROWN_MID }, children: t("level_gold") }, void 0, false)
            ] }, void 0, true),
            /* @__PURE__ */ jsxDEV("div", { className: "p-3 rounded-xl border text-center", style: { background: colors.bgCardHover, borderColor: BORDER }, children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-xl font-bold", style: { color: BROWN }, children: [
                profile.rating.toFixed(1),
                "/5"
              ] }, void 0, true),
              /* @__PURE__ */ jsxDEV("p", { className: "text-xs", style: { color: BROWN_LIGHT }, children: t("last_30_days") }, void 0, false)
            ] }, void 0, true)
          ] }, void 0, true)
        ] }, void 0, true)
      ] }, void 0, true)
    ] }, void 0, true)
  ] }, void 0, true) }, void 0, false);
}
