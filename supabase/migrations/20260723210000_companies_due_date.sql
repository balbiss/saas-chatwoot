-- Data de vencimento por empresa. Quando vencida, a IA para de responder
-- (ver get-company-config) mas o Chatwoot e o painel continuam acessíveis.
ALTER TABLE public.companies ADD COLUMN due_date DATE;
