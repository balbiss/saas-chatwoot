alter table agendamento_pagamentos
  add column if not exists appointment_id uuid references appointments(id);
