-- Pagamento automatico via Pix (Mercado Pago): token da empresa, campos de
-- produto (tipo digital/fisico, arquivo pra entrega digital, estoque,
-- opt-in de venda com Pix) e tabela de pedidos ligando pagamento a
-- produto/conversa. Usado pelos fluxos gerar_pagamento_pix e pelo webhook
-- de confirmacao no n8n.
ALTER TABLE public.companies ADD COLUMN mercadopago_access_token TEXT;

ALTER TABLE public.products ADD COLUMN tipo TEXT NOT NULL DEFAULT 'fisico' CHECK (tipo IN ('fisico', 'digital'));
ALTER TABLE public.products ADD COLUMN arquivo_digital_url TEXT;
ALTER TABLE public.products ADD COLUMN estoque INTEGER;
ALTER TABLE public.products ADD COLUMN vender_com_pix BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  conversation_id TEXT,
  contact_phone TEXT,
  mercadopago_payment_id TEXT,
  valor NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'expirado')),
  expira_em TIMESTAMPTZ,
  lembrete_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos select own" ON public.pedidos FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "pedidos insert own" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "pedidos update own" ON public.pedidos FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "pedidos delete own" ON public.pedidos FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX pedidos_company_id_idx ON public.pedidos(company_id);
CREATE INDEX pedidos_product_id_idx ON public.pedidos(product_id);
CREATE TRIGGER trg_pedidos_touch BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Decremento atomico: evita vender a mesma ultima unidade duas vezes em
-- caso de notificacoes concorrentes do Mercado Pago.
CREATE OR REPLACE FUNCTION public.decrementar_estoque(p_product_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  linhas INTEGER;
BEGIN
  UPDATE public.products SET estoque = estoque - 1
  WHERE id = p_product_id AND estoque IS NOT NULL AND estoque > 0;
  GET DIAGNOSTICS linhas = ROW_COUNT;
  RETURN linhas > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decrementar_estoque(UUID) TO service_role;
