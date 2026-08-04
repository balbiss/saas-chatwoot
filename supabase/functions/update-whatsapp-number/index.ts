import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

async function chatwootFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CHATWOOT_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", api_access_token: CHATWOOT_API_TOKEN, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwoot ${path} falhou (${res.status}): ${text}`);
  }
  return res.json();
}

// Mesmo padrao de auth do agent-create: identifica a empresa pelo dono logado
// (auth.uid() = companies.user_id), nunca pelo que o cliente manda no body.
async function getOwnCompany(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("UNAUTHORIZED");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("UNAUTHORIZED");

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, whatsapp_phone, chatwoot_account_id, chatwoot_inbox_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company) throw new Error("FORBIDDEN");

  return { company, admin };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let company, admin;
  try {
    ({ company, admin } = await getOwnCompany(req));
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    return json({ error: "Nao foi possivel identificar sua empresa." }, message === "FORBIDDEN" ? 403 : 401);
  }

  try {
    const { whatsapp_phone } = await req.json();
    if (!whatsapp_phone) return json({ error: "whatsapp_phone e obrigatorio" }, 400);
    if (!company.chatwoot_account_id || !company.chatwoot_inbox_id) {
      return json({ error: "Essa empresa ainda nao tem uma caixa de WhatsApp configurada. Fale com o suporte." }, 422);
    }

    const phone = whatsapp_phone.startsWith("+") ? whatsapp_phone : `+${whatsapp_phone}`;
    if (phone === company.whatsapp_phone) {
      return json({ error: "Esse ja e o numero atual." }, 400);
    }

    // Troca o numero NO MESMO inbox (nunca apaga/recria) -- e o que mantem o
    // vinculo com a IA (n8n) e o historico de conversas intactos. Depois disso
    // o WhatsApp fica desconectado ate escanear o QR code de novo (numero novo
    // = sessao nova no Baileys, isso e inevitavel).
    const inbox = await chatwootFetch(
      `/api/v1/accounts/${company.chatwoot_account_id}/inboxes/${company.chatwoot_inbox_id}`,
      { method: "PATCH", body: JSON.stringify({ channel: { phone_number: phone } }) },
    );

    const { error: updateError } = await admin
      .from("companies")
      .update({ whatsapp_phone: phone })
      .eq("id", company.id);
    if (updateError) throw updateError;

    return json({
      success: true,
      whatsapp_phone: phone,
      chatwoot_account_id: company.chatwoot_account_id,
      chatwoot_inbox_id: inbox.id,
      message: "Numero atualizado. Agora escaneie o QR code novo na caixa de entrada pra conectar.",
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao atualizar o numero" }, 500);
  }
});
