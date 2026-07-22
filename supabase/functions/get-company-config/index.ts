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
    let phoneParam = url.searchParams.get("phone");

    const accountId = url.searchParams.get("account_id");
    const inboxId = url.searchParams.get("inbox_id");
    if (!phoneParam && accountId && inboxId) {
      const inboxResp = await fetch(
        `${CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/inboxes/${inboxId}`,
        { headers: { api_access_token: CHATWOOT_API_TOKEN } },
      );
      if (!inboxResp.ok) return json({ error: "Não foi possível buscar o inbox no Chatwoot" }, 502);
      const inbox = await inboxResp.json();
      phoneParam = inbox.phone_number ?? null;
    }

    if (!phoneParam) return json({ error: "Informe 'phone' ou 'account_id'+'inbox_id'" }, 400);

    const phoneDigits = onlyDigits(phoneParam);
    if (!phoneDigits) return json({ error: "Número de telefone inválido" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, ai_prompt, whatsapp_phone")
      .not("whatsapp_phone", "is", null);
    if (error) throw error;

    const company = companies.find((c) => onlyDigits(c.whatsapp_phone ?? "") === phoneDigits);
    if (!company) return json({ error: "Empresa não encontrada para esse número" }, 404);

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
      resources,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao buscar configuração da empresa" }, 500);
  }
});
