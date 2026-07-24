-- Deixa explicito se o valor cobrado no agendamento e um SINAL (parte do
-- valor, resto combinado no dia) ou o VALOR INTEGRAL da visita -- sem isso
-- a mensagem da IA pro cliente ficava ambigua sobre quanto falta pagar.
ALTER TABLE public.resources ADD COLUMN tipo_cobranca TEXT NOT NULL DEFAULT 'sinal' CHECK (tipo_cobranca IN ('sinal', 'integral'));
ALTER TABLE public.agendamento_pagamentos ADD COLUMN tipo_cobranca TEXT NOT NULL DEFAULT 'sinal' CHECK (tipo_cobranca IN ('sinal', 'integral'));
