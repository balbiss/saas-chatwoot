import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

type ChatwootConversation = {
  created_at: number;
  first_reply_created_at: number | null;
  labels: string[];
};

async function fetchAllConversations(accountId: string, sinceUnix: number): Promise<ChatwootConversation[]> {
  const all: ChatwootConversation[] = [];
  let page = 1;
  const MAX_PAGES = 20;

  while (page <= MAX_PAGES) {
    const res = await fetch(
      `${CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations?status=all&page=${page}`,
      { headers: { api_access_token: CHATWOOT_API_TOKEN } },
    );
    if (!res.ok) break;
    const body = await res.json();
    const items: ChatwootConversation[] = body?.data?.payload ?? [];
    if (items.length === 0) break;

    all.push(...items);
    // Chatwoot returns conversations most-recent-first — once a whole page is
    // older than the period start, no need to keep paginating.
    if (items.every((c) => c.created_at < sinceUnix)) break;
    page += 1;
  }

  return all;
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
      .select("id, chatwoot_account_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company?.chatwoot_account_id) {
      return json({ error: "Empresa sem conta do Chatwoot configurada." }, 400);
    }

    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? "30") || 30;
    const sinceUnix = Math.floor(Date.now() / 1000) - days * 86400;

    const conversations = await fetchAllConversations(company.chatwoot_account_id, sinceUnix);
    const periodConversations = conversations.filter((c) => c.created_at >= sinceUnix);

    const total = periodConversations.length;
    const withFirstReply = periodConversations.filter((c) => c.first_reply_created_at);
    const avgFirstResponseSeconds = withFirstReply.length
      ? Math.round(
          withFirstReply.reduce((sum, c) => sum + (c.first_reply_created_at! - c.created_at), 0) /
            withFirstReply.length,
        )
      : null;
    const resolvedByAiCount = periodConversations.filter((c) => !(c.labels || []).includes("agente_off")).length;

    const dailyMap = new Map<string, number>();
    for (const c of periodConversations) {
      const day = new Date(c.created_at * 1000).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }
    const dailyVolume = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return json({
      days,
      total_conversations: total,
      avg_first_response_seconds: avgFirstResponseSeconds,
      resolved_by_ai_count: resolvedByAiCount,
      resolved_by_ai_pct: total ? Math.round((resolvedByAiCount / total) * 100) : null,
      daily_volume: dailyVolume,
    });
  } catch (err) {
    console.error(err);
    return json({ error: "Erro inesperado ao calcular métricas." }, 500);
  }
});
