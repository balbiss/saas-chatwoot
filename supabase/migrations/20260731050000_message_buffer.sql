-- Buffer de mensagens: agrupa mensagens seguidas do mesmo contato numa
-- janela curta antes da IA responder, em vez de responder cada mensagem
-- separada (evita a IA "cortar" o cliente no meio de uma sequencia de
-- mensagens rapidas). So o service_role (n8n) mexe nessa tabela.
CREATE TABLE public.message_buffer (
  conversation_id BIGINT PRIMARY KEY,
  account_id BIGINT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.message_buffer TO service_role;
ALTER TABLE public.message_buffer ENABLE ROW LEVEL SECURITY;
