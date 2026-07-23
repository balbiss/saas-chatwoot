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

async function requireAdmin(req: Request, supabaseAnon: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("UNAUTHORIZED");
  const { data: userData, error: userError } = await supabaseAnon.auth.getUser();
  if (userError || !userData.user) throw new Error("UNAUTHORIZED");

  const { data: admin } = await supabaseAnon
    .from("admins")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!admin) throw new Error("FORBIDDEN");
}

async function chatwootFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CHATWOOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      api_access_token: CHATWOOT_API_TOKEN,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwoot ${path} falhou (${res.status}): ${text}`);
  }
  return res.json();
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
    await requireAdmin(req, supabaseAnon);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    return json({ error: "Acesso restrito a administradores." }, message === "FORBIDDEN" ? 403 : 401);
  }

  try {
    const { company_id, name, whatsapp_phone, due_date } = await req.json();
    if (!company_id) return json({ error: "company_id é obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: company, error: fetchError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .single();
    if (fetchError) throw fetchError;

    const phone = whatsapp_phone
      ? whatsapp_phone.startsWith("+") ? whatsapp_phone : `+${whatsapp_phone}`
      : undefined;

    if (company.chatwoot_account_id && name && name !== company.name) {
      await chatwootFetch(`/api/v1/accounts/${company.chatwoot_account_id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
    }

    if (company.chatwoot_account_id && company.chatwoot_inbox_id && phone && phone !== company.whatsapp_phone) {
      await chatwootFetch(
        `/api/v1/accounts/${company.chatwoot_account_id}/inboxes/${company.chatwoot_inbox_id}`,
        { method: "PATCH", body: JSON.stringify({ channel: { phone_number: phone } }) },
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.whatsapp_phone = phone;
    if (due_date !== undefined) updates.due_date = due_date || null;

    const { data: updated, error: updateError } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", company_id)
      .select()
      .single();
    if (updateError) throw updateError;

    return json({ company: updated });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao atualizar empresa" }, 500);
  }
});
