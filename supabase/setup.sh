#!/usr/bin/env bash
# Automatiza a configuracao completa do Supabase pra este projeto:
# aplica todas as migrations, faz deploy de todas as Edge Functions e
# configura os secrets que elas precisam. Roda de novo sempre que quiser
# (idempotente: db push/functions deploy/secrets set sao seguros de repetir).
#
# Uso:
#   cp supabase/setup.env.example supabase/setup.env
#   # preencha supabase/setup.env com os dados do SEU projeto
#   bash supabase/setup.sh

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="supabase/setup.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Nao encontrei $ENV_FILE."
  echo "Copie supabase/setup.env.example para $ENV_FILE e preencha antes de rodar de novo."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

REQUIRED_VARS=(SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF)
missing=0
for v in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "Faltando no $ENV_FILE: $v"
    missing=1
  fi
done
if [ "$missing" = 1 ]; then
  exit 1
fi

echo "==> 1/4 - Login na CLI do Supabase"
npx --yes supabase login --token "$SUPABASE_ACCESS_TOKEN"

echo "==> 2/4 - Linkando o projeto ($SUPABASE_PROJECT_REF)"
npx --yes supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "==> 3/4 - Aplicando todas as migrations (supabase/migrations)"
npx --yes supabase db push

echo "==> 4/4 - Deploy das Edge Functions + secrets"
FUNCTIONS=$(find supabase/functions -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)
for fn in $FUNCTIONS; do
  echo "  - deploy: $fn"
  npx --yes supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
done

SECRET_VARS=(
  CHATWOOT_BASE_URL
  CHATWOOT_API_TOKEN
  CHATWOOT_PLATFORM_TOKEN
  CHATWOOT_AGENCY_USER_ID
  N8N_SDR_WEBHOOK_URL
  N8N_CLEAR_MEMORY_URL
  N8N_CLEAR_MEMORY_SECRET
  OPENAI_API_KEY
)
SECRET_ARGS=()
for v in "${SECRET_VARS[@]}"; do
  if [ -n "${!v:-}" ]; then
    SECRET_ARGS+=("$v=${!v}")
  else
    echo "  aviso: $v vazio em $ENV_FILE, pulando esse secret (configure antes de usar a funcao que precisa dele)"
  fi
done
if [ "${#SECRET_ARGS[@]}" -gt 0 ]; then
  echo "  - configurando ${#SECRET_ARGS[@]} secret(s)"
  npx --yes supabase secrets set "${SECRET_ARGS[@]}" --project-ref "$SUPABASE_PROJECT_REF"
fi

echo ""
echo "Supabase configurado. Migrations aplicadas, Edge Functions no ar, secrets definidos."
echo "Proximo passo: painel (ver ../painel/README.md) e n8n (ver ../n8n/README.md)."
