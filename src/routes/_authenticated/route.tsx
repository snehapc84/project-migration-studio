import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "student" | "lecturer";

export const Route = createFileRoute("/_authenticated")({
  // The session lives in browser storage, so this gate runs on the client only.
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const role = (roles?.[0]?.role ?? null) as AppRole | null;
    return { user: data.user, role };
  },
  component: () => <Outlet />,
});
