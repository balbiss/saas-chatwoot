-- Guarda o tipo do arquivo (application/pdf, video/mp4 etc) pra IA e o
-- painel saberem diferenciar PDF de vídeo ao listar/enviar.
ALTER TABLE public.company_documents ADD COLUMN content_type TEXT NOT NULL DEFAULT 'application/pdf';
