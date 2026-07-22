import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Chamada pelo n8n (CALENDARIO - CALLBACK) depois de trocar o code do Google
// pelo refresh_token. Não é exposta ao navegador.
Deno.serve(async (req: Request) => {
  try {
    const { company_id, refresh_token, calendar_id } = await req.json();
    if (!company_id || !refresh_token) {
      return json({ error: "company_id e refresh_token são obrigatórios" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: tokenError } = await supabase.from("google_calendar_tokens").upsert(
      { company_id, refresh_token, calendar_id: calendar_id || "primary" },
      { onConflict: "company_id" },
    );
    if (tokenError) throw tokenError;

    const { error: connError } = await supabase.from("google_calendar_connections").upsert(
      { company_id, status: "connected", connected_at: new Date().toISOString() },
      { onConflict: "company_id" },
    );
    if (connError) throw connError;

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro ao salvar token do calendário" }, 500);
  }
});
