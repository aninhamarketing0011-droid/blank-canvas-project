import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    });

    const body = await req.json().catch(() => null);

    if (!body || typeof body.code !== "string") {
      return new Response(
        JSON.stringify({ error: "Código de convite inválido." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const rawCode = body.code.trim();

    if (!rawCode) {
      return new Response(
        JSON.stringify({ error: "Informe um código de convite." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: invite, error: fetchError } = await supabase
      .from("invite_codes")
      .select("id, role, status")
      .eq("code", rawCode)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar invite_codes:", fetchError);
      return new Response(
        JSON.stringify({ error: "Falha ao validar código. Tente novamente." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!invite) {
      return new Response(
        JSON.stringify({ error: "Código de convite não encontrado." }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (invite.status !== "available") {
      return new Response(
        JSON.stringify({ error: "Este código já foi utilizado ou está expirado." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { error: updateError } = await supabase
      .from("invite_codes")
      .update({ status: "used", used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Erro ao atualizar invite_codes:", updateError);
      return new Response(
        JSON.stringify({ error: "Não foi possível consumir o código. Tente novamente." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(
      JSON.stringify({ role: invite.role }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("Erro inesperado em validate-invite:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao validar código." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
