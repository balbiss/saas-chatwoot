-- Registro de quem entrou em contato pela primeira vez (nome + telefone),
-- pra relatorio/exportacao. Numero repetido nao duplica (so a primeira
-- mensagem de cada contato gera um lead).
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,
  first_contact_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, phone)
);
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads select own" ON public.leads FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX leads_company_id_idx ON public.leads(company_id);
CREATE INDEX leads_first_contact_at_idx ON public.leads(first_contact_at);
