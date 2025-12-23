import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export type AppRole = "admin" | "vendor" | "client" | "driver" | "user";

interface UseAuthResult {
  user: ReturnType<typeof useSupabaseAuth>["user"];
  role: AppRole | null;
  loading: boolean;
}

export function useAuth(): UseAuthResult {
  const { user, loading } = useSupabaseAuth();

  const role = (user?.role as AppRole) ?? null;

  return { user, role, loading };
}
