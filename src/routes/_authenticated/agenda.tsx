import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCheck2, CalendarX2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientButton, PageHeader } from "@/components/gradient-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agenda")({ component: Page });

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const N8N_CALENDAR_CONNECT_URL = "https://webhook.inoovaweb.com.br/webhook/calendario-status";

function useGoogleCalendarConnection(companyId: string | undefined) {
  return useQuery({
    queryKey: ["google-calendar-connection", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

function GoogleCalendarCard({ companyId }: { companyId: string | undefined }) {
  const { data: connection, isLoading } = useGoogleCalendarConnection(companyId);
  const connected = connection?.status === "connected";

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {connected ? (
            <CalendarCheck2 className="size-4 text-positive" />
          ) : (
            <CalendarX2 className="size-4 text-muted-foreground" />
          )}
          Google Calendar
        </CardTitle>
        <CardDescription>
          {connected
            ? `Conectado${connection?.calendar_id ? ` — ${connection.calendar_id}` : ""}.`
            : "Conecte sua agenda do Google para a IA marcar visitas automaticamente."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <a
          href={companyId ? `${N8N_CALENDAR_CONNECT_URL}?company_id=${companyId}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
        >
          <GradientButton disabled={isLoading || !companyId}>
            {connected ? "Reconectar" : "Conectar Google Calendar"}
          </GradientButton>
        </a>
      </CardContent>
    </Card>
  );
}

type AgendaForm = {
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
  buffer_minutos: number;
  max_por_dia: number | null;
};

const DEFAULT_FORM: AgendaForm = {
  dias_semana: [1, 2, 3, 4, 5],
  hora_inicio: "09:00",
  hora_fim: "18:00",
  duracao_minutos: 30,
  buffer_minutos: 0,
  max_por_dia: null,
};

function ScheduleCard({ companyId }: { companyId: string | undefined }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AgendaForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ["agenda-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_config")
        .select("*")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (config) {
      setForm({
        dias_semana: config.dias_semana,
        hora_inicio: config.hora_inicio.slice(0, 5),
        hora_fim: config.hora_fim.slice(0, 5),
        duracao_minutos: config.duracao_minutos,
        buffer_minutos: config.buffer_minutos,
        max_por_dia: config.max_por_dia,
      });
    }
  }, [config]);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      dias_semana: f.dias_semana.includes(day)
        ? f.dias_semana.filter((d) => d !== day)
        : [...f.dias_semana, day].sort(),
    }));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agenda_config")
        .upsert({ company_id: companyId, ...form }, { onConflict: "company_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agenda-config", companyId] });
      toast.success("Agenda salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar a agenda");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Horários de atendimento</CardTitle>
        <CardDescription>Dias, horários e o tempo de folga entre um atendimento e outro.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label className="mb-2 block">Dias da semana</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = form.dias_semana.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="hora_inicio">Início</Label>
            <Input
              id="hora_inicio"
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="hora_fim">Fim</Label>
            <Input
              id="hora_fim"
              type="time"
              value={form.hora_fim}
              onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="duracao">Duração de cada atendimento (min)</Label>
            <Input
              id="duracao"
              type="number"
              min={5}
              step={5}
              value={form.duracao_minutos}
              onChange={(e) => setForm((f) => ({ ...f, duracao_minutos: Number(e.target.value) }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="buffer">Tempo de folga entre atendimentos (min)</Label>
            <Input
              id="buffer"
              type="number"
              min={0}
              step={5}
              value={form.buffer_minutos}
              onChange={(e) => setForm((f) => ({ ...f, buffer_minutos: Number(e.target.value) }))}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="max_por_dia">Máximo de atendimentos por dia (opcional)</Label>
          <Input
            id="max_por_dia"
            type="number"
            min={1}
            value={form.max_por_dia ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, max_por_dia: e.target.value ? Number(e.target.value) : null }))}
            placeholder="Sem limite"
            className="mt-1.5 max-w-[200px]"
          />
        </div>

        <div className="flex justify-end pt-2">
          <GradientButton onClick={handleSave} loading={saving} disabled={isLoading}>
            Salvar agenda
          </GradientButton>
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const { data: company } = useCompany();

  return (
    <div>
      <PageHeader title="Agenda & Calendário" description="Conecte o Google Calendar e defina seus horários de atendimento." />
      <div className="grid max-w-3xl grid-cols-1 gap-5 p-6 lg:p-10">
        <GoogleCalendarCard companyId={company?.id} />
        <ScheduleCard companyId={company?.id} />
      </div>
    </div>
  );
}
