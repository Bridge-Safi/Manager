import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { Locale } from "date-fns";

export function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat("fr-MA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " DH"
  );
}

export function formatTimeAgo(dateStr: string, locale: Locale = fr): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale });
}

export function formatDateTime(dateStr: string, locale: Locale = fr): string {
  return format(new Date(dateStr), "dd MMM yyyy à HH:mm", { locale });
}
