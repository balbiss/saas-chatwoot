-- Agenda passa a ser por profissional (recurso), não por empresa.
-- Cada empresa pode ter N profissionais, cada um com seu próprio
-- calendar_id do Google, horário, duração de consulta e limite/dia.

DROP TABLE IF EXISTS public.agenda_config;

CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calendar_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources select own" ON public.resources FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "resources insert own" ON public.resources FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "resources update own" ON public.resources FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "resources delete own" ON public.resources FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX resources_company_id_idx ON public.resources(company_id);
CREATE TRIGGER trg_resources_touch BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.agenda_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL UNIQUE REFERENCES public.resources(id) ON DELETE CASCADE,
  dias_semana INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  hora_inicio TIME NOT NULL DEFAULT '09:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',
  duracao_minutos INTEGER NOT NULL DEFAULT 30,
  buffer_minutos INTEGER NOT NULL DEFAULT 0,
  max_por_dia INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_config TO authenticated;
GRANT ALL ON public.agenda_config TO service_role;
ALTER TABLE public.agenda_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda_config select own" ON public.agenda_config FOR SELECT TO authenticated USING (resource_id IN (SELECT r.id FROM public.resources r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "agenda_config insert own" ON public.agenda_config FOR INSERT TO authenticated WITH CHECK (resource_id IN (SELECT r.id FROM public.resources r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "agenda_config update own" ON public.agenda_config FOR UPDATE TO authenticated USING (resource_id IN (SELECT r.id FROM public.resources r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid())) WITH CHECK (resource_id IN (SELECT r.id FROM public.resources r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "agenda_config delete own" ON public.agenda_config FOR DELETE TO authenticated USING (resource_id IN (SELECT r.id FROM public.resources r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE INDEX agenda_config_resource_id_idx ON public.agenda_config(resource_id);
CREATE TRIGGER trg_agenda_config_touch BEFORE UPDATE ON public.agenda_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
