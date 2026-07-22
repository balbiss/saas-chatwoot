-- Guarda o refresh_token do Google Calendar por empresa. Fica INACESSÍVEL
-- pro navegador/usuário (RLS habilitado, sem nenhuma policy pra
-- authenticated/anon) — só o service_role (usado pelas Edge Functions)
-- consegue ler/escrever aqui.
CREATE TABLE public.google_calendar_tokens (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_calendar_tokens TO service_role;
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_google_calendar_tokens_touch BEFORE UPDATE ON public.google_calendar_tokens FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
