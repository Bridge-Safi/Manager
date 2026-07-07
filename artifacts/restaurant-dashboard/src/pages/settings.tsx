import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Copy, RefreshCw, Check, Store, Link2, AlertTriangle } from "lucide-react";

import { getAuthToken } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

interface RestaurantProfile {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copy, copied };
}

export default function Settings() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { copy, copied } = useCopy();

  const webhookUrl = `${window.location.origin}${BASE}/api/webhook/orders`;

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data: RestaurantProfile) => {
        setProfile(data);
        setName(data.name ?? "");
      })
      .catch(() => toast({ title: t.toastLoadError, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = async () => {
    if (!profile || name.trim() === profile.name) return;
    setSaving(true);
    try {
      if (!profile) return;
      const res = await fetch(`${API}/restaurants/${profile.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim() }),
      });
      const updated = await res.json();
      setProfile(updated);
      setName(updated.name);
      toast({ title: t.toastNameSaved });
    } catch {
      toast({ title: t.toastError, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenToken = async () => {
    setRegenerating(true);
    // Token regeneration not yet implemented in Bridge Manager API
    setTimeout(() => {
      setConfirmRegen(false);
      setRegenerating(false);
      toast({ title: "Fonctionnalité bientôt disponible", description: "La régénération de token sera disponible prochainement." });
    }, 800);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-base md:text-lg">{t.settingsTitle}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{t.settingsSubtitle}</p>
      </div>

      <div className="flex-1 overflow-auto pb-16 md:pb-0 p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                <Store size={16} className="text-[#FF6B35]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">{t.restaurantSection}</h2>
                <p className="text-[11px] text-gray-400">{t.restaurantSectionSub}</p>
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  placeholder={t.namePlaceholder}
                  className="flex-1"
                  data-testid="input-restaurant-name"
                />
                <Button
                  onClick={handleSaveName}
                  disabled={saving || name.trim() === profile?.name}
                  data-testid="btn-save-name"
                  className="bg-[#FF6B35] hover:bg-orange-600 text-white px-4"
                >
                  {saving ? "..." : t.saveBtn}
                </Button>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Link2 size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">{t.integrationTitle}</h2>
                <p className="text-[11px] text-gray-400">{t.integrationSubtitle}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 mb-5 mt-3 leading-relaxed">
              {t.integrationInfo}
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    {t.labelWebhookUrl}
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <code className="flex-1 text-xs text-gray-700 font-mono truncate" data-testid="webhook-url">
                      {webhookUrl}
                    </code>
                    <button
                      onClick={() => copy(webhookUrl, "url")}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
                      data-testid="btn-copy-url"
                      title={t.copyUrlTitle}
                    >
                      {copied === "url" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    {t.labelHeader}
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <code className="flex-1 text-xs text-gray-600 font-mono">X-Bridge-Token</code>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    {t.labelToken}
                  </label>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                    <code className="flex-1 text-xs text-gray-700 font-mono truncate" data-testid="api-token">
                      {profile?.apiToken}
                    </code>
                    <button
                      onClick={() => copy(profile!.apiToken, "token")}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
                      data-testid="btn-copy-token"
                      title={t.copyTokenTitle}
                    >
                      {copied === "token" ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {!loading && (
            <section className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <h2 className="font-bold text-gray-900 text-sm">{t.dangerTitle}</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">{t.dangerInfo}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRegen(true)}
                data-testid="btn-regen-token"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                <RefreshCw size={13} className="mr-1.5" /> {t.regenBtn}
              </Button>
            </section>
          )}

        </div>
      </div>

      <Dialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>{t.regenDialogTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">{t.regenDialogMsg}</p>
          <DialogFooter className="mt-5 gap-2">
            <Button variant="outline" onClick={() => setConfirmRegen(false)} className="flex-1">{t.cancelBtn}</Button>
            <Button
              variant="destructive"
              onClick={handleRegenToken}
              disabled={regenerating}
              data-testid="btn-confirm-regen"
              className="flex-1"
            >
              <RefreshCw size={13} className="mr-1.5" />
              {regenerating ? t.inProgress : t.confirmBtn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
