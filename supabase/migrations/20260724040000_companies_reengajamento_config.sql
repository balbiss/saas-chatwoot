-- Reengajamento automatico de leads que ficaram X dias sem resposta e ainda
-- nao foram qualificados (nunca receberam a label agente_off no Chatwoot).
-- Configuravel por empresa.
ALTER TABLE public.companies ADD COLUMN reengajamento_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN reengajamento_dias_inativo INTEGER NOT NULL DEFAULT 3;
