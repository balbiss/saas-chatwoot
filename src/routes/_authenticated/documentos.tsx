import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradientButton, PageHeader } from "@/components/gradient-button";

export const Route = createFileRoute("/_authenticated/documentos")({ component: Page });

function Page() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["company-documents", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const handleUpload = async (file: File) => {
    if (!company) return;
    setUploading(true);
    try {
      const path = `${company.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("company-documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: signed } = await supabase.storage.from("company-documents").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      const file_url = signed?.signedUrl ?? path;

      const { error } = await supabase.from("company_documents").insert({
        company_id: company.id,
        title: file.name.replace(/\.pdf$/i, ""),
        file_url,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["company-documents", company.id] });
      toast.success("Documento enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar o documento");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este documento?")) return;
    const { error } = await supabase.from("company_documents").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["company-documents", company?.id] });
    toast.success("Documento removido.");
  };

  return (
    <div>
      <PageHeader title="Documentos" description="PDFs que a IA pode enviar aos clientes durante o atendimento." />
      <div className="max-w-2xl p-6 lg:p-10">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <GradientButton onClick={() => fileInputRef.current?.click()} loading={uploading}>
          <Upload className="size-4" />
          Enviar PDF
        </GradientButton>

        <div className="mt-6 space-y-2">
          {!isLoading && documents?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
          )}
          {documents?.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between p-4 shadow-card">
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:underline">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{doc.title}</span>
              </a>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                <Trash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
