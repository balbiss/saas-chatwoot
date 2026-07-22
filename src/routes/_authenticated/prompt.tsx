import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany, useInvalidateCompany } from "@/lib/company";
import { PROMPT_TEMPLATES } from "@/lib/prompt-templates";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GradientButton, PageHeader } from "@/components/gradient-button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/prompt")({ component: Page });

function Page() {
  const { data: company, isLoading } = useCompany();
  const invalidateCompany = useInvalidateCompany();
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (company) setPrompt(company.ai_prompt ?? "");
  }, [company]);

  const replacePrompt = (newPrompt: string) => {
    if (prompt.trim() && !confirm("Isso vai substituir o texto atual do prompt. Continuar?")) {
      return;
    }
    setPrompt(newPrompt);
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Descreva seu negócio em algumas frases primeiro.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-prompt", {
        body: { description: description.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      replacePrompt(data.prompt);
      toast.success("Prompt gerado — revise e salve quando estiver bom.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar o prompt com IA");
    } finally {
      setGenerating(false);
    }
  };

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
      <div className="max-w-2xl space-y-5 p-6 lg:p-10">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="size-4 text-primary" />
              Não sabe por onde começar?
            </CardTitle>
            <CardDescription>
              Descreva seu negócio em poucas frases (o que vocês fazem, horário, tipo de atendimento) e a IA escreve um prompt profissional pra você revisar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Ex: Somos uma imobiliária em Curitiba, vendemos e alugamos apartamentos, atendemos de segunda a sábado das 9h às 18h."
              className="resize-y"
            />
            <div className="mt-3 flex justify-end">
              <GradientButton onClick={handleGenerate} loading={generating} disabled={isLoading}>
                <Wand2 className="size-4" />
                Gerar com IA
              </GradientButton>
            </div>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Ou comece com um modelo pronto pro seu tipo de negócio:
          </p>
          <div className="flex flex-wrap gap-2">
            {PROMPT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => replacePrompt(t.prompt)}
                className={cn(
                  "rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              Instruções para a IA
            </CardTitle>
            <CardDescription>
              Depois de escolher um modelo, ajuste os detalhes (nome da empresa, regras específicas) antes de salvar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              rows={18}
              placeholder="Ex: Você é a assistente virtual da Imobiliária XPTO. Seja cordial, responda dúvidas sobre imóveis disponíveis e sempre ofereça agendar uma visita..."
              className="resize-y font-mono text-[13px] leading-relaxed"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{prompt.length} caracteres</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <GradientButton onClick={handleSave} loading={saving} disabled={isLoading}>
            Salvar prompt
          </GradientButton>
        </div>
      </div>
    </div>
  );
}
