-- Bloqueios pontuais de agenda: imprevistos onde o profissional (ou a
-- empresa toda, se resource_id for nulo) nao vai atender num dia
-- especifico, por um periodo (dia todo, manha, tarde ou noite).
-- Usado pelos fluxos agendar/verificar_disponibilidade no n8n antes de
-- confirmar qualquer horario.
CREATE TABLE public.agenda_bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  periodo TEXT NOT NULL DEFAULT 'dia_todo' CHECK (periodo IN ('dia_todo', 'manha', 'tarde', 'noite')),
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_bloqueios TO authenticated;
GRANT ALL ON public.agenda_bloqueios TO service_role;
ALTER TABLE public.agenda_bloqueios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda_bloqueios select own" ON public.agenda_bloqueios FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agenda_bloqueios insert own" ON public.agenda_bloqueios FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agenda_bloqueios update own" ON public.agenda_bloqueios FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agenda_bloqueios delete own" ON public.agenda_bloqueios FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX agenda_bloqueios_company_id_idx ON public.agenda_bloqueios(company_id);
CREATE INDEX agenda_bloqueios_data_idx ON public.agenda_bloqueios(data);
