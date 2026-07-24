import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { Building2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import inoovawebIcon from "@/assets/inoovaweb-icon.png";

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
      <header className="flex items-center justify-between border-b border-border/60 bg-card px-6 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <img src={inoovawebIcon} alt="InoovaWeb" className="size-7 rounded-lg" />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            InoovaWeb <span className="text-muted-foreground">— Super Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Building2 className="size-4" />
            Minha empresa
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
