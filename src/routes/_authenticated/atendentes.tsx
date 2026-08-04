import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, CircleAlert, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GradientButton, PageHeader } from "@/components/gradient-button";

const DEPARTAMENTOS = [
  { value: "vendas", label: "Vendas" },
  { value: "financeiro", label: "Financeiro" },
  { value: "manutencao", label: "Manutenção" },
  { value: "humano", label: "Humano (geral)" },
];

type RoletaMembro = { id: string; chatwoot_user_id: number; chatwoot_user_name: string | null; ordem: number };
type Roleta = { id: string; nome: string; departamento: string; roleta_membros: RoletaMembro[] };

export const Route = createFileRoute("/_authenticated/atendentes")({ component: Page });

type Agent = {
  id: number;
  name: string;
  email: string;
  availability_status: string;
  role: string;
  confirmed: boolean;
};
type Team = { id: number; name: string; member_ids: number[] };

const EMPTY_FORM = { name: "", email: "", password: "" };

function AgentDialog({
  teams,
  open,
  onOpenChange,
  onSaved,
}: {
  teams: Team[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleTeam = (id: number) => {
    setTeamIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-create", {
        body: { name: form.name.trim(), email: form.email.trim(), password: form.password, team_ids: teamIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Atendente criado — já pode entrar com o e-mail e senha cadastrados, sem precisar confirmar nada.");
      setForm(EMPTY_FORM);
      setTeamIds([]);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar atendente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo atendente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="a_name">Nome</Label>
            <Input id="a_name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="a_email">E-mail</Label>
            <Input
              id="a_email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="a_password">Senha</Label>
            <Input
              id="a_password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1.5"
              placeholder="Mínimo 8 caracteres"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Já entra ativo com essa senha — não precisa confirmar nenhum e-mail.
            </p>
          </div>
          {teams.length > 0 && (
            <div>
              <Label>Times</Label>
              <div className="mt-1.5 space-y-2 rounded-lg border border-border/60 p-3">
                {teams.map((team) => (
                  <label key={team.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={teamIds.includes(team.id)} onCheckedChange={() => toggleTeam(team.id)} />
                    {team.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <GradientButton onClick={handleSave} loading={saving}>
            Criar atendente
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoletaDialog({
  agents,
  open,
  onOpenChange,
  onSaved,
}: {
  agents: Agent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { data: company } = useCompany();
  const [nome, setNome] = useState("");
  const [departamento, setDepartamento] = useState("vendas");
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleMember = (id: number) => {
    setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const handleSave = async () => {
    if (!company) return;
    if (!nome.trim()) {
      toast.error("Dê um nome pra roleta.");
      return;
    }
    if (memberIds.length === 0) {
      toast.error("Selecione pelo menos um atendente.");
      return;
    }
    setSaving(true);
    try {
      const { data: roleta, error: roletaError } = await supabase
        .from("roletas")
        .insert({ company_id: company.id, nome: nome.trim(), departamento })
        .select()
        .single();
      if (roletaError) throw roletaError;

      const membros = memberIds.map((id, idx) => ({
        roleta_id: roleta.id,
        chatwoot_user_id: id,
        chatwoot_user_name: agents.find((a) => a.id === id)?.name ?? null,
        ordem: idx,
      }));
      const { error: membrosError } = await supabase.from("roleta_membros").insert(membros);
      if (membrosError) throw membrosError;

      toast.success("Roleta criada.");
      setNome("");
      setDepartamento("vendas");
      setMemberIds([]);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar roleta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova roleta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="r_nome">Nome</Label>
            <Input
              id="r_nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1.5"
              placeholder="Ex: Aluguel, Consulta, Suporte técnico..."
            />
          </div>
          <div>
            <Label>Departamento</Label>
            <Select value={departamento} onValueChange={setDepartamento}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTAMENTOS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              A roleta só entra em ação quando a IA transferir pra esse departamento específico.
            </p>
          </div>
          <div>
            <Label>Atendentes da roleta (ordem de rodízio = ordem selecionada)</Label>
            <div className="mt-1.5 space-y-2 rounded-lg border border-border/60 p-3">
              {agents.length === 0 && <p className="text-sm text-muted-foreground">Cadastre atendentes primeiro.</p>}
              {agents.map((agent) => (
                <label key={agent.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={memberIds.includes(agent.id)} onCheckedChange={() => toggleMember(agent.id)} />
                  {agent.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <GradientButton onClick={handleSave} loading={saving}>
            Criar roleta
          </GradientButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Page() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [roletaDialogOpen, setRoletaDialogOpen] = useState(false);

  const { data: roletas, isLoading: loadingRoletas } = useQuery({
    queryKey: ["roletas", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roletas")
        .select("id, nome, departamento, roleta_membros(id, chatwoot_user_id, chatwoot_user_name, ordem)")
        .eq("company_id", company!.id)
        .order("created_at");
      if (error) throw error;
      return data as unknown as Roleta[];
    },
    enabled: !!company?.id,
  });

  const invalidateRoletas = () => queryClient.invalidateQueries({ queryKey: ["roletas", company?.id] });

  const handleDeleteRoleta = async (roleta: Roleta) => {
    if (!confirm(`Apagar a roleta "${roleta.nome}"? Transferências desse departamento voltam a usar quem está online.`)) return;
    try {
      const { error } = await supabase.from("roletas").delete().eq("id", roleta.id);
      if (error) throw error;
      invalidateRoletas();
      toast.success("Roleta apagada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao apagar roleta");
    }
  };

  const handleRemoveMembro = async (membro: RoletaMembro) => {
    try {
      const { error } = await supabase.from("roleta_membros").delete().eq("id", membro.id);
      if (error) throw error;
      invalidateRoletas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover atendente da roleta");
    }
  };

  const handleAddMembro = async (roleta: Roleta, agentId: string) => {
    const id = Number(agentId);
    const agent = agents.find((a) => a.id === id);
    try {
      const { error } = await supabase.from("roleta_membros").insert({
        roleta_id: roleta.id,
        chatwoot_user_id: id,
        chatwoot_user_name: agent?.name ?? null,
        ordem: roleta.roleta_membros.length,
      });
      if (error) throw error;
      invalidateRoletas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao adicionar atendente na roleta");
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["agents", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("agent-list");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { agents: Agent[]; teams: Team[] };
    },
    enabled: !!company?.id,
  });

  const agents = data?.agents ?? [];
  const teams = data?.teams ?? [];

  const teamsFor = (agentId: number) => teams.filter((t) => t.member_ids.includes(agentId)).map((t) => t.name);

  const handleRemove = async (agent: Agent) => {
    if (!confirm(`Desligar "${agent.name}"? Ele deixa de aparecer pra ser atribuído em conversas.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("agent-remove", { body: { agent_id: agent.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["agents", company?.id] });
      toast.success("Atendente desligado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao desligar atendente");
    }
  };

  return (
    <div>
      <PageHeader
        title="Atendentes"
        description="Cadastre e desligue quem atende no seu WhatsApp — já entra ativo, sem precisar confirmar e-mail."
      />
      <div className="max-w-7xl p-8 lg:p-14">
        <div className="mb-5 flex justify-end">
          <GradientButton onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Novo atendente
          </GradientButton>
        </div>

        {!isLoading && agents.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum atendente cadastrado ainda.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{agent.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{agent.email}</p>
                </div>
                {agent.role !== "administrator" && (
                  <Button variant="outline" size="sm" onClick={() => handleRemove(agent)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {agent.availability_status === "online" ? "Online" : "Offline"}
                </Badge>
                {agent.role === "administrator" && (
                  <Badge variant="outline" className="text-[10px]">
                    Administrador
                  </Badge>
                )}
                {!agent.confirmed && (
                  <Badge variant="outline" className="gap-1 text-[10px] text-destructive">
                    <CircleAlert className="size-3" />
                    Pendente de ativação
                  </Badge>
                )}
                {teamsFor(agent.id).map((name) => (
                  <Badge key={name} variant="outline" className="text-[10px]">
                    {name}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-10 mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Roletas de atendimento</h2>
            <p className="text-sm text-muted-foreground">
              Distribua conversas de um departamento entre vários atendentes em rodízio, em vez de sempre cair em
              quem está online. A IA identifica sozinha qual roleta usar conforme o pedido do cliente.
            </p>
          </div>
          <GradientButton onClick={() => setRoletaDialogOpen(true)}>
            <Plus className="size-4" />
            Nova roleta
          </GradientButton>
        </div>

        {!loadingRoletas && (roletas ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma roleta criada — as transferências continuam indo pra quem estiver online, como sempre.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(roletas ?? []).map((roleta) => {
            const membrosIds = roleta.roleta_membros.map((m) => m.chatwoot_user_id);
            const disponiveis = agents.filter((a) => !membrosIds.includes(a.id));
            return (
              <Card key={roleta.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{roleta.nome}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {DEPARTAMENTOS.find((d) => d.value === roleta.departamento)?.label ?? roleta.departamento}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteRoleta(roleta)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="size-3" />
                  Ordem do rodízio
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {roleta.roleta_membros
                    .slice()
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((membro) => (
                      <Badge key={membro.id} variant="outline" className="gap-1 text-[10px]">
                        {membro.chatwoot_user_name ?? membro.chatwoot_user_id}
                        <button
                          type="button"
                          onClick={() => handleRemoveMembro(membro)}
                          className="ml-0.5 rounded-full hover:text-destructive"
                        >
                          <X className="size-2.5" />
                        </button>
                      </Badge>
                    ))}
                </div>
                {disponiveis.length > 0 && (
                  <div className="mt-3">
                    <Select onValueChange={(v) => handleAddMembro(roleta, v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="+ adicionar atendente" />
                      </SelectTrigger>
                      <SelectContent>
                        {disponiveis.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <AgentDialog
        teams={teams}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["agents", company?.id] })}
      />
      <RoletaDialog agents={agents} open={roletaDialogOpen} onOpenChange={setRoletaDialogOpen} onSaved={invalidateRoletas} />
    </div>
  );
}
