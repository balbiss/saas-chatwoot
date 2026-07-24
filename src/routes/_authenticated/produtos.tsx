import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import type { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_authenticated/produtos")({ component: Page });

type Product = Tables<"products">;

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
}

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "",
  available: true,
  tipo: "fisico" as "fisico" | "digital",
  estoque: "",
  vender_com_pix: false,
};

function ProductDialog({
  companyId,
  product,
  open,
  onOpenChange,
  onSaved,
}: {
  companyId: string;
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? "",
          price: product.price != null ? String(product.price) : "",
          category: product.category ?? "",
          available: product.available,
          tipo: (product.tipo as "fisico" | "digital") ?? "fisico",
          estoque: product.estoque != null ? String(product.estoque) : "",
          vender_com_pix: product.vender_com_pix ?? false,
        }
      : EMPTY_FORM,
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (digitalFile && digitalFile.size > MAX_FILE_SIZE) {
      toast.error(`Arquivo digital muito grande (${(digitalFile.size / 1024 / 1024).toFixed(1)}MB). Limite: 50MB.`);
      return;
    }
    setSaving(true);
    try {
      let photo_url = product?.photo_url ?? null;
      if (photoFile) {
        const path = `${companyId}/${Date.now()}-${sanitizeFileName(photoFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("product-photos")
          .upload(path, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        photo_url = supabase.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
      }

      let arquivo_digital_url = product?.arquivo_digital_url ?? null;
      if (form.tipo === "digital" && digitalFile) {
        const path = `${companyId}/${Date.now()}-${sanitizeFileName(digitalFile.name)}`;
        const { error: uploadError } = await supabase.storage
          .from("company-documents")
          .upload(path, digitalFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: signed } = await supabase.storage
          .from("company-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        arquivo_digital_url = signed?.signedUrl ?? path;
      }

      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: form.price ? Number(form.price) : null,
        category: form.category.trim() || null,
        available: form.available,
        photo_url,
        tipo: form.tipo,
        estoque: form.estoque.trim() ? Number(form.estoque) : null,
        vender_com_pix: form.vender_com_pix,
        arquivo_digital_url: form.tipo === "digital" ? arquivo_digital_url : null,
      };

      const { error } = product
        ? await supabase.from("products").update(payload).eq("id", product.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;

      toast.success(product ? "Produto atualizado." : "Produto criado.");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar o produto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="p_name">Nome</Label>
            <Input id="p_name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="p_description">Descrição</Label>
            <Textarea
              id="p_description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p_price">Preço</Label>
              <Input
                id="p_price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="p_category">Categoria</Label>
              <Input
                id="p_category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="p_photo">Foto</Label>
            <Input id="p_photo" type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="mt-1.5" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.available} onCheckedChange={(v) => setForm((f) => ({ ...f, available: v }))} />
            <Label>Disponível</Label>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="mb-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Venda automática (opcional):</span> configure aqui se
              quiser que a IA cobre e libere esse produto sozinha via Pix. Pra funcionar, cadastre o token do
              Mercado Pago em <span className="font-medium text-foreground">Prompt da IA</span>.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de produto</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as "fisico" | "digital" }))}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisico">Físico</SelectItem>
                    <SelectItem value="digital">Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="p_estoque">Estoque (vazio = ilimitado)</Label>
                <Input
                  id="p_estoque"
                  type="number"
                  min={0}
                  value={form.estoque}
                  onChange={(e) => setForm((f) => ({ ...f, estoque: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            {form.tipo === "digital" && (
              <div className="mt-3">
                <Label htmlFor="p_digital">Arquivo digital (entregue automaticamente após pagamento)</Label>
                <Input
                  id="p_digital"
                  type="file"
                  onChange={(e) => setDigitalFile(e.target.files?.[0] ?? null)}
                  className="mt-1.5"
                />
                {product?.arquivo_digital_url && !digitalFile && (
                  <p className="mt-1 text-xs text-muted-foreground">Já tem um arquivo enviado. Escolha outro só se quiser trocar.</p>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <Label htmlFor="p_pix" className="cursor-pointer">
                Vender com Pix automático (Mercado Pago)
              </Label>
              <Switch
                id="p_pix"
                checked={form.vender_com_pix}
                onCheckedChange={(v) => setForm((f) => ({ ...f, vender_com_pix: v }))}
              />
            </div>
            {form.vender_com_pix && !form.price && (
              <p className="mt-2 text-xs text-destructive">Defina um preço pra poder vender com Pix.</p>
            )}
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

function Page() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const handleDelete = async (product: Product) => {
    if (!confirm(`Remover "${product.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["products", company?.id] });
    toast.success("Produto removido.");
  };

  return (
    <div>
      <PageHeader title="Produtos" description="Fotos, preços e disponibilidade que a IA usa para responder clientes." />
      <div className="max-w-7xl p-8 lg:p-14">
        <div className="mb-5 flex justify-end">
          <GradientButton
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo produto
          </GradientButton>
        </div>

        {!isLoading && products?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products?.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="flex aspect-video items-center justify-center bg-muted">
                {product.photo_url ? (
                  <img src={product.photo_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{product.name}</p>
                  {!product.available && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
                      Indisponível
                    </Badge>
                  )}
                </div>
                {product.price != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.tipo === "digital" && (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <FileText className="size-3" />
                      Digital
                    </Badge>
                  )}
                  {product.vender_com_pix && (
                    <Badge variant="outline" className="text-[10px] text-primary">
                      Pix automático
                    </Badge>
                  )}
                  {product.estoque != null && (
                    <Badge variant="outline" className="text-[10px]">
                      Estoque: {product.estoque}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(product);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(product)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {company && (
        <ProductDialog
          key={editing?.id ?? "new"}
          companyId={company.id}
          product={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["products", company.id] })}
        />
      )}
    </div>
  );
}
