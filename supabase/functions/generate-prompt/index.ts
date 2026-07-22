import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_META_PROMPT = `Você é um especialista em criar prompts de sistema para assistentes de atendimento via WhatsApp/IA.
Dado uma descrição simples de um negócio (escrita pelo próprio dono, sem termos técnicos), escreva um prompt de sistema completo e profissional para a IA de atendimento desse negócio.

O prompt gerado deve:
- Ser em português do Brasil.
- Ter uma seção de "Identidade e tom de voz" adequada ao tipo de negócio.
- Ter uma seção de "Regras de atendimento" numerada, cobrindo: como entender a necessidade do cliente, como usar o catálogo de produtos/serviços cadastrado (nunca inventar preço ou disponibilidade), quando oferecer agendamento, e quando transferir para um atendente humano.
- Ter uma seção final de encerramento.
- Ser específico ao negócio descrito (usar o tipo de negócio, tom sugerido pela descrição), mas sem inventar dados factuais (nome exato, endereço, preços) que não foram informados — usar um placeholder como [NOME DA EMPRESA] quando necessário.

Responda APENAS com o texto do prompt final, sem comentários adicionais, sem markdown, sem aspas envolvendo o texto todo.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { description } = await req.json();
    if (!description || typeof description !== "string" || !description.trim()) {
      return new Response(JSON.stringify({ error: "Descreva o negócio antes de gerar o prompt." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          { role: "system", content: SYSTEM_META_PROMPT },
          { role: "user", content: description.trim() },
        ],
      }),
    });

    if (!completion.ok) {
      const errText = await completion.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "Falha ao gerar o prompt com a IA." }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const json = await completion.json();
    const prompt = json.choices?.[0]?.message?.content?.trim();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "A IA não retornou um prompt válido." }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ prompt }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erro inesperado ao gerar o prompt." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
