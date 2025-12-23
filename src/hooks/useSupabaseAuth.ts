import { useEffect, useState } from "react";
import type { ManualSession, ManualUser } from "@/lib/manualSession";
import { getManualSession } from "@/lib/manualSession";

export function useSupabaseAuth() {
  const [user, setUser] = useState<ManualUser | null>(null);
  const [session, setSession] = useState<ManualSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      const current = getManualSession();
      setSession(current);
      setUser(current?.user ?? null);
      setLoading(false);
    };

    load();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "darktech_manual_session") {
        load();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return { user, session, loading };
}
