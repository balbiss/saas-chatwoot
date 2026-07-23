import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MessageSquareText,
  CalendarClock,
  Package,
  FileText,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import inoovawebIcon from "@/assets/inoovaweb-icon.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (admin) throw redirect({ to: "/admin" });

    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV_ITEMS = [
  { to: "/prompt", label: "Prompt da IA", icon: MessageSquareText },
  { to: "/agenda", label: "Agenda & Calendário", icon: CalendarClock },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/documentos", label: "Documentos", icon: FileText },
] as const;

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-2">
          <img src={inoovawebIcon} alt="InoovaWeb" className="size-8 rounded-lg" />
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
            InoovaWeb
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-muted"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className={cn("relative z-10 size-4", active ? "text-foreground" : "text-muted-foreground")} />
                <span className={cn("relative z-10", active ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}