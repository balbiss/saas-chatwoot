import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GradientButton, PageHeader } from "@/components/gradient-button";

export const Route = createFileRoute("/admin/")({ component: Page });

type Company = Tables<"companies">;

type CreateCompanyInput = {
  name: string;
  whatsapp_phone: string;
  owner_email: string;
  owner_password: string;
};

async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function createCompany(input: CreateCompanyInput) {
  const { data, error } = await supabase.functions.invoke("admin-create-company", {
    body: input,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

function Page() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCompanyInput>({
    name: "",
    whatsapp_phone: "",
    owner_email: "",
    owner_password: "",
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: fetchCompanies,
  });

  const mutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      toast.success("Empresa criada! Falta escanear o QR code do WhatsApp no Chatwoot.");
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      setOpen(false);
      setForm({ name: "", whatsapp_phone: "", owner_email: "", owner_password: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar empresa");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div>
      <PageHeader title="Empresas" description="Crie e acompanhe as empresas do painel." />
      <div className="mx-auto max-w-4xl p-6 lg:p-10">
        <div className="mb-6 flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <GradientButton>
                <Plus className="size-4" />
                Nova empresa
              </GradientButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar empresa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="name">Nome da empresa</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp_phone">WhatsApp (com DDI, ex: 5511999999999)</Label>
                  <Input
                    id="whatsapp_phone"
                    value={form.whatsapp_phone}
                    onChange={(e) => setForm((f) => ({ ...f, whatsapp_phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner_email">E-mail de login da empresa</Label>
                  <Input
                    id="owner_email"
                    type="email"
                    value={form.owner_email}
                    onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="owner_password">Senha de login da empresa</Label>
                  <Input
                    id="owner_password"
                    type="text"
                    value={form.owner_password}
                    onChange={(e) => setForm((f) => ({ ...f, owner_password: e.target.value }))}
                    required
                  />
                </div>
                <GradientButton type="submit" loading={mutation.isPending} className="mt-2">
                  Criar empresa
                </GradientButton>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {companies?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma empresa criada ainda.</p>
          )}
          {companies?.map((company) => (
            <Card key={company.id} className="flex items-center gap-4 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Building2 className="size-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{company.name || "(sem nome)"}</p>
                <p className="text-sm text-muted-foreground">
                  {company.whatsapp_phone || "sem WhatsApp"} · inbox #{company.chatwoot_inbox_id || "-"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
