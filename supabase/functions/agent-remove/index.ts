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

async function requireCompany(req: Request) {
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
    .select("id, chatwoot_account_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (companyError) throw companyError;
  if (!company) throw new Error("FORBIDDEN");

  return company;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let company;
  try {
    company = await requireCompany(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    return json({ error: "Nao foi possivel identificar sua empresa." }, message === "FORBIDDEN" ? 403 : 401);
  }

  try {
    const { agent_id } = await req.json();
    if (!agent_id) return json({ error: "agent_id e obrigatorio" }, 400);

    // Endpoint da propria conta (nao Platform API) -- remove o account_user e,
    // se o usuario nao tiver mais nenhuma conta, apaga o registro dele (comportamento
    // padrao do proprio Chatwoot, ver AgentsController#destroy).
    const res = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${company.chatwoot_account_id}/agents/${agent_id}`,
      { method: "DELETE", headers: { api_access_token: CHATWOOT_API_TOKEN } },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Chatwoot falhou (${res.status}): ${text}`);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao remover atendente" }, 500);
  }
});
