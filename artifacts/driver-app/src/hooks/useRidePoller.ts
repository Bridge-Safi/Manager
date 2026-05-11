import { useGetMyPendingRide, getGetMyPendingRideQueryKey } from "@workspace/api-client-react";

export function useRidePoller(driverId: number) {
  const { data } = useGetMyPendingRide(
    { driverId },
    {
      query: {
        queryKey: getGetMyPendingRideQueryKey({ driverId }),
        refetchInterval: driverId > 0 ? 4000 : false,
        enabled: driverId > 0
      }
    }
  );

  if (!data || !data.hasPending || !data.trip) {
    return null;
  }

  return {
    tripId: data.trip.id,
    phase: data.phase ?? "cascade",
    secondsLeft: data.secondsLeft ?? 300
  };
}
