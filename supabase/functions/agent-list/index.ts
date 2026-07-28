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

async function chatwootFetch(path: string) {
  const res = await fetch(`${CHATWOOT_BASE_URL}${path}`, {
    headers: { api_access_token: CHATWOOT_API_TOKEN },
  });
  if (!res.ok) throw new Error(`Chatwoot ${path} falhou (${res.status})`);
  return res.json();
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
    const accountId = company.chatwoot_account_id;

    const [agentsResp, teams] = await Promise.all([
      chatwootFetch(`/api/v1/accounts/${accountId}/agents`),
      chatwootFetch(`/api/v1/accounts/${accountId}/teams`),
    ]);

    const teamsWithMembers = await Promise.all(
      (teams.payload ?? teams).map(async (team: { id: number; name: string }) => {
        const members = await chatwootFetch(`/api/v1/accounts/${accountId}/teams/${team.id}/team_members`);
        const memberList = members.payload ?? members;
        return { id: team.id, name: team.name, member_ids: memberList.map((m: { id: number }) => m.id) };
      }),
    );

    const agents = (agentsResp.payload ?? agentsResp).map(
      (a: { id: number; name: string; email: string; availability_status: string; role: string; confirmed: boolean }) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        availability_status: a.availability_status,
        role: a.role,
        confirmed: a.confirmed,
      }),
    );

    return json({ agents, teams: teamsWithMembers });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Erro ao listar atendentes" }, 500);
  }
});
