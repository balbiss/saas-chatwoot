import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// Chamada pelo n8n a cada mensagem recebida. So registra na PRIMEIRA vez
// que esse telefone fala com essa empresa (numero repetido nao duplica).
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { company_id, name, phone } = await req.json();
    if (!company_id || !phone) return json({ error: "company_id e phone são obrigatórios" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from("leads")
      .upsert(
        { company_id, name: name || null, phone },
        { onConflict: "company_id,phone", ignoreDuplicates: true },
      );
    if (error) throw error;

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao registrar lead" }, 500);
  }
});
