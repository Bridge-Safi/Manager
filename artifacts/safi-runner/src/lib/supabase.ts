import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export let supabase: SupabaseClient;

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
} else {
  console.warn("⚠️ Supabase non configuré — le jeu fonctionne en mode hors-ligne. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  supabase = null as unknown as SupabaseClient;
}

export type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;   // photo de profil (data URL ou https://...)
  sardines_points: number;
  diamonds_collected: number;
  device_fingerprint?: string;
  hardware_prefix?: string;
  player_email?: string;
  /* Programme d'engagement Bridge */
  bridge_phone?: string;
  first_play_date?: string;     // ISO YYYY-MM-DD
  play_days?: { date: string; playSeconds: number }[];
  menus_claimed?: number;
  bonus_days?: string[];                // dates already awarded the +2 000 💎 bonus
  free_delivery_credits?: number;       // crédits de livraison gratuite
  period_diamonds?: number;             // 💎 du cycle en cours (3 jours)
  period_start?: string;                // début du cycle ISO
  created_at?: string;
  updated_at?: string;
};
