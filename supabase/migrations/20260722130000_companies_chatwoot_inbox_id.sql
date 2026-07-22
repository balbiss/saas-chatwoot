-- Guarda o inbox_id do Chatwoot associado à empresa, usado pra sincronizar
-- o ai_prompt salvo no painel com o campo ai_prompt do inbox no Chatwoot
-- (é de lá que o agente de IA em produção realmente lê o prompt).
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS chatwoot_inbox_id TEXT;
