import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHATWOOT_BASE_URL = Deno.env.get("CHATWOOT_BASE_URL")!;
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Aceita qualquer formato (com/sem +, espaços, @s.whatsapp.net do Baileys) e
// compara só pelos dígitos, pra não depender de como o número foi salvo.
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const phoneParam = url.searchParams.get("phone");
    const accountId = url.searchParams.get("account_id");
    const inboxId = url.searchParams.get("inbox_id");

    if (!phoneParam && !accountId && !inboxId) {
      return json({ error: "Informe 'phone' ou 'account_id'+'inbox_id'" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const selectFields = "id, name, ai_prompt, whatsapp_phone, due_date, followup_wait_hours, followup_max_attempts";

    // Casar por inbox_id é mais confiável que por telefone (sobrevive a troca de
    // número que ainda não propagou, ou a diferenças de formatação) -- só cai pro
    // telefone se não achar por aqui, pra não quebrar chamadas antigas que só mandam 'phone'.
    let company = null;
    if (accountId && inboxId) {
      const { data, error } = await supabase
        .from("companies")
        .select(selectFields)
        .eq("chatwoot_account_id", accountId)
        .eq("chatwoot_inbox_id", inboxId)
        .maybeSingle();
      if (error) throw error;
      company = data;
    }

    if (!company) {
      let phoneToMatch = phoneParam;
      if (!phoneToMatch && accountId && inboxId) {
        const inboxResp = await fetch(
          `${CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/inboxes/${inboxId}`,
          { headers: { api_access_token: CHATWOOT_API_TOKEN } },
        );
        if (!inboxResp.ok) return json({ error: "Não foi possível buscar o inbox no Chatwoot" }, 502);
        const inbox = await inboxResp.json();
        phoneToMatch = inbox.phone_number ?? null;
      }

      if (!phoneToMatch) return json({ error: "Informe 'phone' ou 'account_id'+'inbox_id'" }, 400);
      const phoneDigits = onlyDigits(phoneToMatch);
      if (!phoneDigits) return json({ error: "Número de telefone inválido" }, 400);

      const { data: companies, error } = await supabase
        .from("companies")
        .select(selectFields)
        .not("whatsapp_phone", "is", null);
      if (error) throw error;

      company = companies.find((c: { whatsapp_phone: string | null }) => onlyDigits(c.whatsapp_phone ?? "") === phoneDigits) ?? null;
    }

    if (!company) return json({ error: "Empresa não encontrada para esse número" }, 404);

    // Vencida: a IA para de responder, mas o Chatwoot/painel continuam
    // acessíveis normalmente (bloqueio só do lado da IA).
    const today = new Date().toISOString().slice(0, 10);
    const blocked = !!company.due_date && company.due_date < today;
    if (blocked) {
      return json({
        company_id: company.id,
        name: company.name,
        blocked: true,
        blocked_message: "Ola! No momento nao consigo continuar o atendimento automatico. Por favor, entre em contato para regularizar o pagamento.",
      });
    }

    const { data: resources, error: resourcesError } = await supabase
      .from("resources")
      .select("id, name, calendar_id, active, agenda_config(*)")
      .eq("company_id", company.id)
      .eq("active", true);
    if (resourcesError) throw resourcesError;

    return json({
      company_id: company.id,
      name: company.name,
      ai_prompt: company.ai_prompt,
      blocked: false,
      followup_wait_hours: company.followup_wait_hours,
      followup_max_attempts: company.followup_max_attempts,
      resources,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao buscar configuração da empresa" }, 500);
  }
});
