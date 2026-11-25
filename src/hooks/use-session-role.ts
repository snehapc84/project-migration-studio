import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SessionRole = "student" | "lecturer" | null;

/** Client-only: which kind of account (if any) is signed in on this device. */
export function useSessionRole() {
  const [role, setRole] = useState<SessionRole>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (active) {
          setRole(null);
          setReady(true);
        }
        return;
      }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      if (active) {
        setRole((roles?.[0]?.role as SessionRole) ?? null);
        setReady(true);
      }
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { role, ready };
}
