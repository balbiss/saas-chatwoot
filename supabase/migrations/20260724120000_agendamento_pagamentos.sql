-- Agendamento com pagamento antecipado (sinal/visita paga via Pix): a
-- empresa escolhe por profissional/agenda se exige um valor pago antes de
-- confirmar o horario. Tabela de pagamentos ligando a cobranca ao
-- agendamento pretendido (evento so e criado de fato apos o pagamento
-- confirmado, ver workflow CALENDARIO - AGENDAR).
ALTER TABLE public.resources ADD COLUMN exige_pagamento BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.resources ADD COLUMN valor_sinal NUMERIC;

CREATE TABLE public.agendamento_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  nome_lead TEXT,
  telefone TEXT,
  termo_contato TEXT,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamento_pagamentos TO authenticated;
GRANT ALL ON public.agendamento_pagamentos TO service_role;
ALTER TABLE public.agendamento_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agendamento_pagamentos select own" ON public.agendamento_pagamentos FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agendamento_pagamentos insert own" ON public.agendamento_pagamentos FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agendamento_pagamentos update own" ON public.agendamento_pagamentos FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "agendamento_pagamentos delete own" ON public.agendamento_pagamentos FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX agendamento_pagamentos_company_id_idx ON public.agendamento_pagamentos(company_id);
CREATE INDEX agendamento_pagamentos_resource_id_idx ON public.agendamento_pagamentos(resource_id);
CREATE TRIGGER trg_agendamento_pagamentos_touch BEFORE UPDATE ON public.agendamento_pagamentos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
