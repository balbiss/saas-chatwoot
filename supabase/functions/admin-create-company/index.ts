import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHATWOOT_BASE_URL = Deno.env.get("CHATWOOT_BASE_URL")!;
const CHATWOOT_API_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN")!;
const CHATWOOT_ACCOUNT_ID = Deno.env.get("CHATWOOT_ACCOUNT_ID") ?? "1";

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
    headers: { "Content-Type": "application/json" },
  });
}

async function chatwootFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}${path}`, {
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

async function ensureStandardLabels() {
  const existing = await chatwootFetch("/labels");
  const existingTitles = new Set((existing.payload ?? []).map((l: { title: string }) => l.title));
  for (const label of STANDARD_LABELS) {
    if (!existingTitles.has(label.title)) {
      await chatwootFetch("/labels", {
        method: "POST",
        body: JSON.stringify({ label: { title: label.title, color: label.color, show_on_sidebar: true } }),
      });
    }
  }
}

Deno.serve(async (req: Request) => {
  try {
    const { name, whatsapp_phone, owner_email, owner_password } = await req.json();
    if (!name || !whatsapp_phone || !owner_email || !owner_password) {
      return json({ error: "name, whatsapp_phone, owner_email e owner_password são obrigatórios" }, 400);
    }

    const phone = whatsapp_phone.startsWith("+") ? whatsapp_phone : `+${whatsapp_phone}`;

    const inbox = await chatwootFetch("/inboxes", {
      method: "POST",
      body: JSON.stringify({
        name,
        channel: { type: "whatsapp", phone_number: phone, provider: "baileys", provider_config: {} },
      }),
    });

    await ensureStandardLabels();

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
        chatwoot_account_id: String(CHATWOOT_ACCOUNT_ID),
        chatwoot_inbox_id: String(inbox.id),
      })
      .select()
      .single();
    if (companyError) throw companyError;

    return json({
      company_id: company.id,
      chatwoot_inbox_id: inbox.id,
      owner_email,
      message: "Empresa criada. Falta escanear o QR code do WhatsApp no Chatwoot (Configurações > Inboxes).",
    });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao criar empresa" }, 500);
  }
});
