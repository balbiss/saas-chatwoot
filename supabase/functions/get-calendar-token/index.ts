import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Chamada pelos fluxos de agendamento do n8n (verificar_disponibilidade,
// agendar, etc.) pra pegar o refresh_token e fazer chamadas na API do
// Google Calendar. Não é exposta ao navegador.
Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");
    if (!companyId) return json({ error: "company_id é obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("google_calendar_tokens")
      .select("refresh_token, calendar_id")
      .eq("company_id", companyId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return json({ error: "Empresa não conectou o Google Calendar ainda" }, 404);

    return json(data);
  } catch (err) {
    console.error(err);
    return json({ error: "Erro ao buscar token do calendário" }, 500);
  }
});
