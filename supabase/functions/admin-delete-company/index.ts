import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHATWOOT_BASE_URL = Deno.env.get("CHATWOOT_BASE_URL")!;
const CHATWOOT_PLATFORM_TOKEN = Deno.env.get("CHATWOOT_PLATFORM_TOKEN")!;

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

async function requireAdmin(supabaseAnon: ReturnType<typeof createClient>) {
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser();
  if (userError || !userData.user) throw new Error("UNAUTHORIZED");

  const { data: admin } = await supabaseAnon
    .from("admins")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!admin) throw new Error("FORBIDDEN");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    if (!authHeader) throw new Error("UNAUTHORIZED");
    await requireAdmin(supabaseAnon);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    return json({ error: "Acesso restrito a administradores." }, message === "FORBIDDEN" ? 403 : 401);
  }

  try {
    const { company_id } = await req.json();
    if (!company_id) return json({ error: "company_id é obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: company, error: fetchError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();
    if (fetchError) throw fetchError;

    // Apaga a conta inteira no Chatwoot (Platform API) — irreversível.
    if (company.chatwoot_account_id) {
      const res = await fetch(
        `${CHATWOOT_BASE_URL}/platform/api/v1/accounts/${company.chatwoot_account_id}`,
        { method: "DELETE", headers: { api_access_token: CHATWOOT_PLATFORM_TOKEN } },
      );
      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        throw new Error(`Falha ao apagar conta do Chatwoot (${res.status}): ${text}`);
      }
    }

    const { error: deleteError } = await supabase.from("companies").delete().eq("id", company_id);
    if (deleteError) throw deleteError;

    await supabase.auth.admin.deleteUser(company.user_id);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao apagar empresa" }, 500);
  }
});
