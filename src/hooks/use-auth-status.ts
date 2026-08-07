import { useQuery } from "@tanstack/react-query";
import { getAuthStatus } from "@/lib/auth.functions";

export const AUTH_STATUS_QUERY_KEY = ["auth-status"] as const;

export type AuthStatus = { 
  unlocked: boolean;
  userId?: string | null;
  role?: 'super_admin' | 'unit_admin' | null;
  unitIds?: string[];
};

export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: async () => getAuthStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
