import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;

interface UseAuthResult {
  user: ReturnType<typeof useSupabaseAuth>["user"];
  role: AppRole | null;
  loading: boolean;
}

export function useAuth(): UseAuthResult {
  const { user, loading } = useSupabaseAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }

    setRoleLoading(true);

    const loadRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!error && data && data.length > 0) {
        const roles = data.map((r) => r.role as AppRole);
        // Prioridade simples: admin > vendor > client > driver
        const priority: AppRole[] = ["admin", "vendor", "client", "driver"];
        const found = priority.find((p) => roles.includes(p)) ?? roles[0];
        setRole(found);
      } else {
        setRole(null);
      }

      setRoleLoading(false);
    };

    loadRole();
  }, [user]);

  return { user, role, loading: loading || roleLoading };
}
