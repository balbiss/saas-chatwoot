-- Fotos/videos adicionais por produto (alem da foto de capa em
-- products.photo_url). A IA envia a capa como ja fazia, e mais esses itens
-- em sequencia quando o cliente pede pra ver mais.
CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'foto' CHECK (tipo IN ('foto', 'video')),
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_media select own" ON public.product_media FOR SELECT TO authenticated USING (product_id IN (SELECT p.id FROM public.products p JOIN public.companies c ON c.id = p.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "product_media insert own" ON public.product_media FOR INSERT TO authenticated WITH CHECK (product_id IN (SELECT p.id FROM public.products p JOIN public.companies c ON c.id = p.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "product_media update own" ON public.product_media FOR UPDATE TO authenticated USING (product_id IN (SELECT p.id FROM public.products p JOIN public.companies c ON c.id = p.company_id WHERE c.user_id = auth.uid())) WITH CHECK (product_id IN (SELECT p.id FROM public.products p JOIN public.companies c ON c.id = p.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "product_media delete own" ON public.product_media FOR DELETE TO authenticated USING (product_id IN (SELECT p.id FROM public.products p JOIN public.companies c ON c.id = p.company_id WHERE c.user_id = auth.uid()));
CREATE INDEX product_media_product_id_idx ON public.product_media(product_id);
