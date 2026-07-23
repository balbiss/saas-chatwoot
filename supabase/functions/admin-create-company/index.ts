import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHATWOOT_BASE_URL = Deno.env.get("CHATWOOT_BASE_URL")!;
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN")!;
const CHATWOOT_PLATFORM_TOKEN = Deno.env.get("CHATWOOT_PLATFORM_TOKEN")!;
const CHATWOOT_AGENCY_USER_ID = Deno.env.get("CHATWOOT_AGENCY_USER_ID")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STANDARD_LABELS = [
  { title: "agendado", color: "#4a90d9" },
  { title: "confirmado", color: "#2e8540" },
  { title: "aguardando_confirmacao", color: "#e8a33d" },
  { title: "reagendado", color: "#8e44ad" },
  { title: "lead_quente", color: "#e74c3c" },
  { title: "lead_frio", color: "#5b7999" },
  { title: "desqualificado", color: "#7f8c8d" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function chatwootFetch(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${CHATWOOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      api_access_token: token,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Chatwoot ${path} falhou (${res.status}): ${text}`);
  }
  return res.json();
}

// Cada empresa vira uma CONTA isolada no Chatwoot (não um inbox dentro de
// uma conta compartilhada). O usuário da agência (CHATWOOT_AGENCY_USER_ID)
// é adicionado como administrator em toda conta nova, pra poder entrar e
// ver o painel de qualquer empresa com o próprio login.
async function createIsolatedAccount(name: string) {
  const account = await chatwootFetch("/platform/api/v1/accounts", CHATWOOT_PLATFORM_TOKEN, {
    method: "POST",
    body: JSON.stringify({ name, locale: "pt_BR" }),
  });

  await chatwootFetch(`/platform/api/v1/accounts/${account.id}/account_users`, CHATWOOT_PLATFORM_TOKEN, {
    method: "POST",
    body: JSON.stringify({ user_id: Number(CHATWOOT_AGENCY_USER_ID), role: "administrator" }),
  });

  return account;
}

async function ensureStandardLabels(accountId: number) {
  const existing = await chatwootFetch(`/api/v1/accounts/${accountId}/labels`, CHATWOOT_API_TOKEN);
  const existingTitles = new Set((existing.payload ?? []).map((l: { title: string }) => l.title));
  for (const label of STANDARD_LABELS) {
    if (!existingTitles.has(label.title)) {
      await chatwootFetch(`/api/v1/accounts/${accountId}/labels`, CHATWOOT_API_TOKEN, {
        method: "POST",
        body: JSON.stringify({ label: { title: label.title, color: label.color, show_on_sidebar: true } }),
      });
    }
  }
}

// Só quem está na tabela admins pode provisionar empresas.
async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("UNAUTHORIZED");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("UNAUTHORIZED");

  const { data: admin } = await supabase
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

  try {
    await requireAdmin(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNAUTHORIZED";
    return json({ error: "Acesso restrito a administradores." }, message === "FORBIDDEN" ? 403 : 401);
  }

  try {
    const { name, whatsapp_phone, owner_email, owner_password } = await req.json();
    if (!name || !whatsapp_phone || !owner_email || !owner_password) {
      return json({ error: "name, whatsapp_phone, owner_email e owner_password são obrigatórios" }, 400);
    }

    const phone = whatsapp_phone.startsWith("+") ? whatsapp_phone : `+${whatsapp_phone}`;

    const account = await createIsolatedAccount(name);

    const inbox = await chatwootFetch(`/api/v1/accounts/${account.id}/inboxes`, CHATWOOT_API_TOKEN, {
      method: "POST",
      body: JSON.stringify({
        name,
        channel: { type: "whatsapp", phone_number: phone, provider: "baileys", provider_config: {} },
      }),
    });

    await ensureStandardLabels(account.id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
    });
    if (userError) throw userError;

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        user_id: userData.user.id,
        name,
        whatsapp_phone: phone,
        chatwoot_account_id: String(account.id),
        chatwoot_inbox_id: String(inbox.id),
      })
      .select()
      .single();
    if (companyError) throw companyError;

    return json({
      company_id: company.id,
      chatwoot_account_id: account.id,
      chatwoot_inbox_id: inbox.id,
      owner_email,
      message: "Empresa criada em conta isolada no Chatwoot. Falta escanear o QR code do WhatsApp (Configurações > Inboxes).",
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao criar empresa" }, 500);
  }
});
