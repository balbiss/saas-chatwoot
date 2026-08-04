-- Roletas de atendentes: cada empresa pode criar categorias (ex: "Aluguel",
-- "Venda") com uma lista ordenada de atendentes, e a transferência pra
-- humano passa a distribuir entre eles em round-robin (em vez de sempre
-- pegar "quem tá online" no time inteiro). Opt-in: empresa sem nenhuma
-- roleta cadastrada mantém o comportamento antigo (ver workflow n8n).

CREATE TABLE public.roletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  -- Roleta só entra em ação quando o departamento (vendas/financeiro/manutencao/humano,
  -- os mesmos times fixos do DEFAULT_TEAMS) já resolvido bater com este campo — evita
  -- que uma roleta de "vendas" seja considerada numa transferência de "financeiro".
  departamento TEXT NOT NULL,
  ultimo_atendente_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roletas TO authenticated;
GRANT ALL ON public.roletas TO service_role;
ALTER TABLE public.roletas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roletas select own" ON public.roletas FOR SELECT TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "roletas insert own" ON public.roletas FOR INSERT TO authenticated WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "roletas update own" ON public.roletas FOR UPDATE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "roletas delete own" ON public.roletas FOR DELETE TO authenticated USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE INDEX roletas_company_id_idx ON public.roletas(company_id);
CREATE TRIGGER trg_roletas_touch BEFORE UPDATE ON public.roletas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.roleta_membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id UUID NOT NULL REFERENCES public.roletas(id) ON DELETE CASCADE,
  chatwoot_user_id BIGINT NOT NULL,
  chatwoot_user_name TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roleta_membros TO authenticated;
GRANT ALL ON public.roleta_membros TO service_role;
ALTER TABLE public.roleta_membros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roleta_membros select own" ON public.roleta_membros FOR SELECT TO authenticated USING (roleta_id IN (SELECT r.id FROM public.roletas r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "roleta_membros insert own" ON public.roleta_membros FOR INSERT TO authenticated WITH CHECK (roleta_id IN (SELECT r.id FROM public.roletas r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "roleta_membros update own" ON public.roleta_membros FOR UPDATE TO authenticated USING (roleta_id IN (SELECT r.id FROM public.roletas r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid())) WITH CHECK (roleta_id IN (SELECT r.id FROM public.roletas r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE POLICY "roleta_membros delete own" ON public.roleta_membros FOR DELETE TO authenticated USING (roleta_id IN (SELECT r.id FROM public.roletas r JOIN public.companies c ON c.id = r.company_id WHERE c.user_id = auth.uid()));
CREATE INDEX roleta_membros_roleta_id_idx ON public.roleta_membros(roleta_id);

-- Usada pelo n8n (service_role) pra listar as roletas de uma empresa com
-- seus membros já embutidos. Retorna sempre UM objeto {"roletas": [...]}
-- (nunca um array solto), pra não ser fatiado em múltiplos items pelo
-- node de HTTP Request do n8n quando o array vier vazio ou com 1 item só.
CREATE OR REPLACE FUNCTION public.listar_roletas(p_company_id UUID, p_departamento TEXT)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object('roletas', COALESCE(json_agg(json_build_object(
    'id', r.id,
    'nome', r.nome,
    'membros', (
      SELECT COALESCE(json_agg(json_build_object('chatwoot_user_id', m.chatwoot_user_id) ORDER BY m.ordem), '[]'::json)
      FROM public.roleta_membros m WHERE m.roleta_id = r.id
    )
  )), '[]'::json))
  FROM public.roletas r
  WHERE r.company_id = p_company_id AND r.departamento = p_departamento;
$$;
GRANT EXECUTE ON FUNCTION public.listar_roletas(UUID, TEXT) TO service_role;

-- Escolhe o próximo atendente da roleta em round-robin (atômico via lock
-- de linha) e já avança o ponteiro. p_roleta_id nulo ou roleta sem membros
-- retornam assignee_id nulo (o n8n cai pro comportamento antigo nesse caso).
CREATE OR REPLACE FUNCTION public.escolher_proximo_atendente(p_roleta_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_membros BIGINT[];
  v_ultimo BIGINT;
  v_idx INT;
  v_escolhido BIGINT;
BEGIN
  IF p_roleta_id IS NULL THEN
    RETURN json_build_object('assignee_id', NULL);
  END IF;

  SELECT array_agg(chatwoot_user_id ORDER BY ordem) INTO v_membros
  FROM public.roleta_membros WHERE roleta_id = p_roleta_id;

  IF v_membros IS NULL OR array_length(v_membros, 1) = 0 THEN
    RETURN json_build_object('assignee_id', NULL);
  END IF;

  SELECT ultimo_atendente_id INTO v_ultimo
  FROM public.roletas WHERE id = p_roleta_id
  FOR UPDATE;

  v_idx := array_position(v_membros, v_ultimo);
  IF v_idx IS NULL THEN
    v_escolhido := v_membros[1];
  ELSE
    v_escolhido := v_membros[(v_idx % array_length(v_membros, 1)) + 1];
  END IF;

  UPDATE public.roletas SET ultimo_atendente_id = v_escolhido WHERE id = p_roleta_id;

  RETURN json_build_object('assignee_id', v_escolhido);
END;
$$;
GRANT EXECUTE ON FUNCTION public.escolher_proximo_atendente(UUID) TO service_role;
