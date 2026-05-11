import { useGetMyPendingDispatch, getGetMyPendingDispatchQueryKey } from "@workspace/api-client-react";

export function useDispatchPoller(delivererId: number) {
  const { data } = useGetMyPendingDispatch(
    { delivererId },
    {
      query: {
        queryKey: getGetMyPendingDispatchQueryKey({ delivererId }),
        refetchInterval: delivererId > 0 ? 4000 : false,
        enabled: delivererId > 0
      }
    }
  );

  if (!data || !data.hasPending || !data.delivery) {
    return null;
  }

  return {
    deliveryId: data.delivery.id,
    phase: data.phase ?? "primary",
    secondsLeft: data.secondsLeft ?? 60
  };
}
