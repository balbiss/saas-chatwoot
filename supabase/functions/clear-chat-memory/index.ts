import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const N8N_CLEAR_MEMORY_URL = Deno.env.get("N8N_CLEAR_MEMORY_URL")!;
const N8N_CLEAR_MEMORY_SECRET = Deno.env.get("N8N_CLEAR_MEMORY_SECRET")!;

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Não autenticado" }, 401);

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("chatwoot_account_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company?.chatwoot_account_id) {
      return json({ error: "Empresa sem conta do Chatwoot configurada." }, 400);
    }

    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return json({ error: "Informe o telefone." }, 400);
    }

    const res = await fetch(N8N_CLEAR_MEMORY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: N8N_CLEAR_MEMORY_SECRET,
        id_conta: Number(company.chatwoot_account_id),
        telefone: phone.trim(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`n8n respondeu ${res.status}: ${text}`);
    }

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao limpar a memória." }, 500);
  }
});
