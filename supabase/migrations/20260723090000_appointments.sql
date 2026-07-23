-- Guarda cada visita/consulta agendada via Google Calendar, ligada a um
-- profissional (resource) específico. Usada pelos fluxos agendar,
-- verificar_disponibilidade, confirmar_agendamento e reagendar no n8n.
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  conversation_id TEXT,
  contact_phone TEXT,
  title TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,
  google_event_link TEXT,
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments select own" ON public.appointments FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "appointments insert own" ON public.appointments FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "appointments update own" ON public.appointments FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "appointments delete own" ON public.appointments FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX appointments_company_id_idx ON public.appointments(company_id);
CREATE INDEX appointments_conversation_id_idx ON public.appointments(conversation_id);
CREATE TRIGGER trg_appointments_touch BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
