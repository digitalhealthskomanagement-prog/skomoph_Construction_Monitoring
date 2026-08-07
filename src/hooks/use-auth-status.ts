import { useQuery } from "@tanstack/react-query";
import { getUnlockedStatus } from "@/lib/gate.functions";

export const AUTH_STATUS_QUERY_KEY = ["auth-status"] as const;

export type AuthStatus = { unlocked: boolean };

export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: async () => getUnlockedStatus(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
