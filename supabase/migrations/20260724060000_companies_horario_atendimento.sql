-- Horario de atendimento humano (usado pelo fluxo de transferencia pra
-- humano, pra saber se atribui o time agora ou avisa que esta fora do
-- horario). Configuravel por empresa: dias da semana + inicio/fim, com
-- suporte a virada de madrugada (ex: 22:00 as 06:00).
ALTER TABLE public.companies ADD COLUMN horario_atendimento_dias INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}';
ALTER TABLE public.companies ADD COLUMN horario_atendimento_inicio TIME NOT NULL DEFAULT '08:00';
ALTER TABLE public.companies ADD COLUMN horario_atendimento_fim TIME NOT NULL DEFAULT '18:00';
