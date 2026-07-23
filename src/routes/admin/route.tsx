import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (!admin) throw redirect({ to: "/" });

    return { user: data.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4 lg:px-10">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          InoovaWeb — Super Admin
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
