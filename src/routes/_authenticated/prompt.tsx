import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useInvalidateCompany } from "@/lib/company";
import { Textarea } from "@/components/ui/textarea";
import { GradientButton, PageHeader } from "@/components/gradient-button";

export const Route = createFileRoute("/_authenticated/prompt")({ component: Page });

function Page() {
  const { data: company, isLoading } = useCompany();
  const invalidateCompany = useInvalidateCompany();
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setPrompt(company.ai_prompt ?? "");
  }, [company]);

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ ai_prompt: prompt })
        .eq("id", company.id);
      if (error) throw error;
      invalidateCompany();
      toast.success("Prompt salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar o prompt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Prompt da IA"
        description="Explique como a IA deve se comportar, o tom de voz e as regras de atendimento."
      />
      <div className="max-w-2xl p-6 lg:p-10">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          rows={16}
          placeholder="Ex: Você é a assistente virtual da Imobiliária XPTO. Seja cordial, responda dúvidas sobre imóveis disponíveis e sempre ofereça agendar uma visita..."
          className="resize-y rounded-2xl shadow-card"
        />
        <div className="mt-4 flex justify-end">
          <GradientButton onClick={handleSave} loading={saving} disabled={isLoading}>
            Salvar prompt
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
