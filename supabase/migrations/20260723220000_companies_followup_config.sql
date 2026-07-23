-- Tempo de espera (em horas, igual pra todas as tentativas) e numero maximo
-- de tentativas de follow-up automatico, configuraveis por empresa.
ALTER TABLE public.companies ADD COLUMN followup_wait_hours INTEGER NOT NULL DEFAULT 2;
ALTER TABLE public.companies ADD COLUMN followup_max_attempts INTEGER NOT NULL DEFAULT 3;
