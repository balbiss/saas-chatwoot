-- Painel CRM: empresas (tenants), agenda, Google Calendar, produtos e documentos.

CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  whatsapp_phone TEXT,
  chatwoot_account_id TEXT,
  ai_prompt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies select own" ON public.companies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "companies insert own" ON public.companies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "companies update own" ON public.companies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "companies delete own" ON public.companies FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX companies_user_id_idx ON public.companies(user_id);
CREATE INDEX companies_whatsapp_phone_idx ON public.companies(whatsapp_phone);
CREATE TRIGGER trg_companies_touch BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.agenda_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
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
CREATE POLICY "agenda_config select own" ON public.agenda_config FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agenda_config insert own" ON public.agenda_config FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agenda_config update own" ON public.agenda_config FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agenda_config delete own" ON public.agenda_config FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX agenda_config_company_id_idx ON public.agenda_config(company_id);
CREATE TRIGGER trg_agenda_config_touch BEFORE UPDATE ON public.agenda_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  calendar_id TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_calendar_connections TO authenticated;
GRANT ALL ON public.google_calendar_connections TO service_role;
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gcal select own" ON public.google_calendar_connections FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "gcal insert own" ON public.google_calendar_connections FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "gcal update own" ON public.google_calendar_connections FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "gcal delete own" ON public.google_calendar_connections FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX gcal_company_id_idx ON public.google_calendar_connections(company_id);
CREATE TRIGGER trg_gcal_touch BEFORE UPDATE ON public.google_calendar_connections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  category TEXT,
  photo_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products select own" ON public.products FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "products insert own" ON public.products FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "products update own" ON public.products FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "products delete own" ON public.products FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX products_company_id_idx ON public.products(company_id);
CREATE TRIGGER trg_products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs select own" ON public.company_documents FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "docs insert own" ON public.company_documents FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "docs update own" ON public.company_documents FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "docs delete own" ON public.company_documents FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX company_documents_company_id_idx ON public.company_documents(company_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-documents', 'company-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product-photos authenticated read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-photos');
CREATE POLICY "product-photos public read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'product-photos');
CREATE POLICY "product-photos authenticated write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-photos');
CREATE POLICY "product-photos authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-photos') WITH CHECK (bucket_id = 'product-photos');
CREATE POLICY "product-photos authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-photos');

CREATE POLICY "company-documents authenticated read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-documents');
CREATE POLICY "company-documents authenticated write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-documents');
CREATE POLICY "company-documents authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-documents') WITH CHECK (bucket_id = 'company-documents');
CREATE POLICY "company-documents authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-documents');
