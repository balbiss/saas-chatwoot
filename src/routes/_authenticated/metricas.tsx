import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Users, CalendarClock, CheckCircle2, MessagesSquare, Timer, Bot, ShoppingBag, Wallet, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { StatTile } from "@/components/ui/stat-tile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PageHeader } from "@/components/gradient-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/metricas")({ component: Page });

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
] as const;

type MetricsResponse = {
  total_conversations: number;
  avg_first_response_seconds: number | null;
  resolved_by_ai_count: number;
  resolved_by_ai_pct: number | null;
  daily_volume: { date: string; count: number }[];
};

async function fetchSalesData(companyId: string, sinceIso: string) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("valor")
    .eq("company_id", companyId)
    .eq("status", "pago")
    .gte("created_at", sinceIso);
  if (error) throw error;
  const vendas = data ?? [];
  const total = vendas.reduce((sum, p) => sum + (p.valor ?? 0), 0);
  return {
    quantidade: vendas.length,
    total,
    ticketMedio: vendas.length > 0 ? total / vendas.length : 0,
  };
}

async function fetchFunnelData(companyId: string, sinceIso: string) {
  const [leadsRes, appointmentsRes, confirmedRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("first_contact_at", sinceIso),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", sinceIso),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "confirmado")
      .gte("created_at", sinceIso),
  ]);
  if (leadsRes.error) throw leadsRes.error;
  if (appointmentsRes.error) throw appointmentsRes.error;
  if (confirmedRes.error) throw confirmedRes.error;
  return {
    leads: leadsRes.count ?? 0,
    appointments: appointmentsRes.count ?? 0,
    confirmed: confirmedRes.count ?? 0,
  };
}

function formatSeconds(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

const chartConfig: ChartConfig = {
  count: { label: "Conversas", color: "var(--primary)" },
};

function Page() {
  const { data: company } = useCompany();
  const [days, setDays] = useState<number>(30);

  const sinceIso = useMemo(() => new Date(Date.now() - days * 86400_000).toISOString(), [days]);

  const { data: funnel, isLoading: loadingFunnel } = useQuery({
    queryKey: ["metrics-funnel", company?.id, days],
    queryFn: () => fetchFunnelData(company!.id, sinceIso),
    enabled: !!company?.id,
  });

  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ["metrics-sales", company?.id, days],
    queryFn: () => fetchSalesData(company!.id, sinceIso),
    enabled: !!company?.id,
  });

  const { data: ai, isLoading: loadingAi } = useQuery({
    queryKey: ["metrics-ai", company?.id, days],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `https://pqbejvhuavzjekznouar.supabase.co/functions/v1/get-metrics?days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar métricas de atendimento");
      return json as MetricsResponse;
    },
    enabled: !!company?.id,
    retry: false,
  });

  const conversionRate = funnel && funnel.leads > 0 ? Math.round((funnel.confirmed / funnel.leads) * 100) : 0;

  return (
    <div>
      <PageHeader title="Métricas" description="Funil de conversão e atendimento da IA." />
      <div className="max-w-6xl space-y-6 p-6 lg:p-10">
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              className={cn(
                "rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-colors",
                days === p.days
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Funil de conversão
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile icon={Users} label="Leads" value={loadingFunnel ? "…" : funnel?.leads ?? 0} />
            <StatTile
              icon={CalendarClock}
              label="Agendamentos"
              value={loadingFunnel ? "…" : funnel?.appointments ?? 0}
            />
            <StatTile
              icon={CheckCircle2}
              label="Confirmados"
              value={loadingFunnel ? "…" : funnel?.confirmed ?? 0}
            />
          </div>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Taxa de conversão (lead → confirmado)</span>
                <span className="font-semibold text-foreground">{conversionRate}%</span>
              </div>
              <Progress value={conversionRate} />
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vendas</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              icon={ShoppingBag}
              label="Vendas pagas"
              value={loadingSales ? "…" : sales?.quantidade ?? 0}
            />
            <StatTile
              icon={Wallet}
              label="Total arrecadado"
              value={
                loadingSales
                  ? "…"
                  : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sales?.total ?? 0)
              }
            />
            <StatTile
              icon={Receipt}
              label="Ticket médio"
              value={
                loadingSales
                  ? "…"
                  : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sales?.ticketMedio ?? 0)
              }
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Atendimento da IA
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              icon={MessagesSquare}
              label="Conversas"
              value={loadingAi ? "…" : ai?.total_conversations ?? 0}
            />
            <StatTile
              icon={Timer}
              label="Tempo médio de 1ª resposta"
              value={loadingAi ? "…" : formatSeconds(ai?.avg_first_response_seconds ?? null)}
            />
            <StatTile
              icon={Bot}
              label="Resolvido só pela IA"
              value={loadingAi ? "…" : ai?.resolved_by_ai_pct != null ? `${ai.resolved_by_ai_pct}%` : "—"}
              hint={ai ? `${ai.resolved_by_ai_count} de ${ai.total_conversations} conversas` : undefined}
            />
          </div>

          {ai && ai.daily_volume.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Conversas por dia</CardTitle>
                <CardDescription>Volume de novas conversas no período selecionado.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                  <BarChart data={ai.daily_volume}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
