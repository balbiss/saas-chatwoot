-- Login separado de super admin (dono da plataforma), usado pra criar
-- empresas novas pelo painel em vez de depender do fluxo antigo do n8n.
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins select self" ON public.admins FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admin enxerga e cria empresas de qualquer usuário (usado na tela de
-- provisionamento); usuários comuns continuam restritos à própria empresa
-- pelas policies já existentes.
CREATE POLICY "companies select admin" ON public.companies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
CREATE POLICY "companies insert admin" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));
