import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CalendarOff, CalendarX2, Clock, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useInvalidateCompany } from "@/lib/company";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GradientButton, PageHeader } from "@/components/gradient-button";
import { Badge } from "@/components/ui/badge";
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

const N8N_CALENDAR_CONNECT_URL = "https://webhook.inoovaweb.com.br/webhook/calendario-auth";

type Resource = Tables<"resources">;
type AgendaConfig = Tables<"agenda_config">;
type ResourceWithAgenda = Resource & { agenda_config: AgendaConfig | null };

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
    <Card>
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
            ? "Conectado. Agora cadastre os profissionais e cole o ID da agenda do Google de cada um."
            : "Conecte a conta do Google da empresa uma única vez — depois cadastre a agenda de cada profissional abaixo."}
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

function HorarioAtendimentoCard({ companyId }: { companyId: string | undefined }) {
  const { data: company } = useCompany();
  const invalidateCompany = useInvalidateCompany();
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [inicio, setInicio] = useState("08:00");
  const [fim, setFim] = useState("18:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) {
      setDias(company.horario_atendimento_dias ?? [1, 2, 3, 4, 5]);
      setInicio((company.horario_atendimento_inicio ?? "08:00:00").slice(0, 5));
      setFim((company.horario_atendimento_fim ?? "18:00:00").slice(0, 5));
    }
  }, [company]);

  const toggleDay = (day: number) => {
    setDias((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day].sort()));
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({
          horario_atendimento_dias: dias,
          horario_atendimento_inicio: inicio,
          horario_atendimento_fim: fim,
        })
        .eq("id", companyId);
      if (error) throw error;
      invalidateCompany();
      toast.success("Horário de atendimento salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar horário de atendimento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-primary" />
          Horário de atendimento
        </CardTitle>
        <CardDescription>
          Quando um time (vendas, financeiro, manutenção ou humano) pode receber conversas transferidas pela
          IA. Fora desse horário, o cliente recebe um aviso e ninguém é notificado até o expediente reabrir.
          Se o atendimento vira a madrugada, coloque um horário de início maior que o de fim (ex: 22:00 às 06:00).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <Label className="mb-2 block">Dias de atendimento</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = dias.includes(day.value);
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ha_inicio">Início</Label>
            <Input id="ha_inicio" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ha_fim">Fim</Label>
            <Input id="ha_fim" type="time" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <GradientButton onClick={handleSave} loading={saving} disabled={!companyId}>
            Salvar horário
          </GradientButton>
        </div>
      </CardContent>
    </Card>
  );
}

type ResourceForm = {
  name: string;
  calendar_id: string;
  active: boolean;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
  buffer_minutos: number;
  max_por_dia: number | null;
};

const DEFAULT_FORM: ResourceForm = {
  name: "",
  calendar_id: "",
  active: true,
  dias_semana: [1, 2, 3, 4, 5],
  hora_inicio: "09:00",
  hora_fim: "18:00",
  duracao_minutos: 30,
  buffer_minutos: 0,
  max_por_dia: null,
};

function ResourceDialog({
  companyId,
  resource,
  open,
  onOpenChange,
  onSaved,
}: {
  companyId: string;
  resource: ResourceWithAgenda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ResourceForm>(() =>
    resource
      ? {
          name: resource.name,
          calendar_id: resource.calendar_id ?? "",
          active: resource.active,
          dias_semana: resource.agenda_config?.dias_semana ?? DEFAULT_FORM.dias_semana,
          hora_inicio: resource.agenda_config?.hora_inicio.slice(0, 5) ?? DEFAULT_FORM.hora_inicio,
          hora_fim: resource.agenda_config?.hora_fim.slice(0, 5) ?? DEFAULT_FORM.hora_fim,
          duracao_minutos: resource.agenda_config?.duracao_minutos ?? DEFAULT_FORM.duracao_minutos,
          buffer_minutos: resource.agenda_config?.buffer_minutos ?? DEFAULT_FORM.buffer_minutos,
          max_por_dia: resource.agenda_config?.max_por_dia ?? null,
        }
      : DEFAULT_FORM,
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      dias_semana: f.dias_semana.includes(day)
        ? f.dias_semana.filter((d) => d !== day)
        : [...f.dias_semana, day].sort(),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome do profissional é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const resourcePayload = {
        company_id: companyId,
        name: form.name.trim(),
        calendar_id: form.calendar_id.trim() || null,
        active: form.active,
      };

      let resourceId = resource?.id;
      if (resource) {
        const { error } = await supabase.from("resources").update(resourcePayload).eq("id", resource.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("resources").insert(resourcePayload).select("id").single();
        if (error) throw error;
        resourceId = data.id;
      }

      const { error: agendaError } = await supabase.from("agenda_config").upsert(
        {
          resource_id: resourceId,
          dias_semana: form.dias_semana,
          hora_inicio: form.hora_inicio,
          hora_fim: form.hora_fim,
          duracao_minutos: form.duracao_minutos,
          buffer_minutos: form.buffer_minutos,
          max_por_dia: form.max_por_dia,
        },
        { onConflict: "resource_id" },
      );
      if (agendaError) throw agendaError;

      toast.success(resource ? "Profissional atualizado." : "Profissional cadastrado.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar o profissional");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? "Editar profissional" : "Novo profissional"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="r_name">Nome</Label>
            <Input
              id="r_name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Dra. Vera Vilhena"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="r_calendar">ID da agenda no Google Calendar</Label>
            <Input
              id="r_calendar"
              value={form.calendar_id}
              onChange={(e) => setForm((f) => ({ ...f, calendar_id: e.target.value }))}
              placeholder="algumcodigo@group.calendar.google.com"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Encontre em Google Calendar → Configurações da agenda do profissional → "ID da agenda".
            </p>
          </div>

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
              <Label htmlFor="r_inicio">Início</Label>
              <Input
                id="r_inicio"
                type="time"
                value={form.hora_inicio}
                onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="r_fim">Fim</Label>
              <Input
                id="r_fim"
                type="time"
                value={form.hora_fim}
                onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="r_duracao">Duração da consulta (min)</Label>
              <Input
                id="r_duracao"
                type="number"
                min={5}
                step={5}
                value={form.duracao_minutos}
                onChange={(e) => setForm((f) => ({ ...f, duracao_minutos: Number(e.target.value) }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="r_buffer">Folga entre consultas (min)</Label>
              <Input
                id="r_buffer"
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
            <Label htmlFor="r_max">Máximo de consultas por dia (opcional)</Label>
            <Input
              id="r_max"
              type="number"
              min={1}
              value={form.max_por_dia ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, max_por_dia: e.target.value ? Number(e.target.value) : null }))}
              placeholder="Sem limite"
              className="mt-1.5 max-w-[160px]"
            />
          </div>
        </div>
        <DialogFooter>
          <GradientButton onClick={handleSave} loading={saving}>
            Salvar
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourcesSection({ companyId }: { companyId: string | undefined }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceWithAgenda | null>(null);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*, agenda_config(*)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as ResourceWithAgenda[];
    },
    enabled: !!companyId,
  });

  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Remover "${resource.name}"?`)) return;
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["resources", companyId] });
    toast.success("Profissional removido.");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Profissionais</CardTitle>
          <CardDescription>Cada um com sua própria agenda, horário e duração de consulta.</CardDescription>
        </div>
        <GradientButton
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          disabled={!companyId}
        >
          <Plus className="size-4" />
          Novo
        </GradientButton>
      </CardHeader>
      <CardContent>
        {!isLoading && resources?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum profissional cadastrado ainda.</p>
        )}
        <div className="space-y-3">
          {resources?.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <UserRound className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {resource.name}
                    {!resource.active && (
                      <Badge variant="secondary" className="ml-2 align-middle text-[10px] uppercase tracking-wide">
                        Inativo
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {resource.agenda_config
                      ? `${resource.agenda_config.hora_inicio.slice(0, 5)}–${resource.agenda_config.hora_fim.slice(0, 5)} · consultas de ${resource.agenda_config.duracao_minutos}min`
                      : "Sem agenda configurada"}
                    {resource.calendar_id ? " · Google Calendar conectado" : " · sem calendar_id"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(resource);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(resource)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {companyId && (
        <ResourceDialog
          companyId={companyId}
          resource={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["resources", companyId] })}
        />
      )}
    </Card>
  );
}

const PERIODOS = [
  { value: "dia_todo", label: "Dia todo" },
  { value: "manha", label: "Manhã (até 12h)" },
  { value: "tarde", label: "Tarde (12h-18h)" },
  { value: "noite", label: "Noite (a partir das 18h)" },
] as const;

type Bloqueio = Tables<"agenda_bloqueios">;

function BloqueiosSection({ companyId }: { companyId: string | undefined }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState("");
  const [periodo, setPeriodo] = useState<string>("dia_todo");
  const [resourceId, setResourceId] = useState<string>("todos");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: resources } = useQuery({
    queryKey: ["resources-simple", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("resources").select("id, name").eq("company_id", companyId!);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: bloqueios, isLoading } = useQuery({
    queryKey: ["agenda-bloqueios", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_bloqueios")
        .select("*")
        .eq("company_id", companyId!)
        .order("data", { ascending: true });
      if (error) throw error;
      return data as Bloqueio[];
    },
    enabled: !!companyId,
  });

  const resourceName = (id: string | null) => {
    if (!id) return "Toda a empresa";
    return resources?.find((r) => r.id === id)?.name ?? "Profissional removido";
  };

  const handleCreate = async () => {
    if (!companyId || !data) {
      toast.error("Escolha uma data.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("agenda_bloqueios").insert({
        company_id: companyId,
        resource_id: resourceId === "todos" ? null : resourceId,
        data,
        periodo,
        motivo: motivo.trim() || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["agenda-bloqueios", companyId] });
      toast.success("Bloqueio criado.");
      setData("");
      setMotivo("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar bloqueio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("agenda_bloqueios").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["agenda-bloqueios", companyId] });
    toast.success("Bloqueio removido.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="size-4 text-primary" />
          Bloqueios de agenda
        </CardTitle>
        <CardDescription>
          Imprevistos: feriado, folga, manutenção etc. A IA não agenda nada pro profissional (ou pra empresa
          toda) no dia e período marcados aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bloqueio_data">Data</Label>
            <Input id="bloqueio_data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Label>Quem é afetado</Label>
          <Select value={resourceId} onValueChange={setResourceId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda a empresa</SelectItem>
              {resources?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3">
          <Label htmlFor="bloqueio_motivo">Motivo (opcional)</Label>
          <Input
            id="bloqueio_motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: feriado, folga, manutenção"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <GradientButton onClick={handleCreate} loading={saving} disabled={!companyId}>
            <Plus className="size-4" />
            Adicionar bloqueio
          </GradientButton>
        </div>

        <div className="mt-5 space-y-2">
          {!isLoading && bloqueios?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</p>
          )}
          {bloqueios?.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="text-sm">
                <span className="font-medium">{new Date(b.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                {" · "}
                <span className="text-muted-foreground">
                  {PERIODOS.find((p) => p.value === b.periodo)?.label} · {resourceName(b.resource_id)}
                  {b.motivo ? ` · ${b.motivo}` : ""}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const { data: company } = useCompany();

  return (
    <div>
      <PageHeader title="Agenda & Calendário" description="Conecte o Google Calendar e cadastre a agenda de cada profissional." />
      <div className="grid max-w-6xl grid-cols-1 gap-5 p-6 lg:grid-cols-12 lg:p-10">
        <div className="space-y-5 lg:col-span-5">
          <GoogleCalendarCard companyId={company?.id} />
          <HorarioAtendimentoCard companyId={company?.id} />
        </div>
        <div className="space-y-5 lg:col-span-7">
          <ResourcesSection companyId={company?.id} />
          <BloqueiosSection companyId={company?.id} />
        </div>
      </div>
    </div>
  );
}
