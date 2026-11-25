import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function LogoutButton() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <Button variant="nav" size="sm" onClick={handleSignOut} disabled={busy}>
      <LogOut />
      <span className="hidden sm:inline">Log out</span>
    </Button>
  );
}
