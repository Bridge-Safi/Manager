import { useMutation } from "@tanstack/react-query";
import { getAuthToken } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Mark an order as ready for pickup.
 * In Bridge Manager, "ready" maps to the "in_delivery" status
 * (available for driver pickup).
 */
export function useMarkOrderReady() {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const token = getAuthToken();
      const res = await fetch(`${BASE}/api/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "in_delivery" }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      return res.json();
    },
  });
}
