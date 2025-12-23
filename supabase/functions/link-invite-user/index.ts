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

    if (!body || typeof body.userId !== "string" || typeof body.code !== "string") {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos. Envie userId e code." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const userId = body.userId.trim();
    const code = body.code.trim();

    if (!userId || !code) {
      return new Response(
        JSON.stringify({ error: "userId e code são obrigatórios." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { data: invite, error: fetchError } = await supabase
      .from("invite_codes")
      .select("id, used_by, status")
      .eq("code", code)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar invite_codes em link-invite-user:", fetchError);
      return new Response(
        JSON.stringify({ error: "Falha ao localizar o código de convite." }),
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

    if (invite.used_by && invite.used_by !== userId) {
      return new Response(
        JSON.stringify({ error: "Este código já está vinculado a outro usuário." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const { error: updateError } = await supabase
      .from("invite_codes")
      .update({ used_by: userId })
      .eq("id", invite.id);

    if (updateError) {
      console.error("Erro ao atualizar used_by em invite_codes:", updateError);
      return new Response(
        JSON.stringify({ error: "Não foi possível vincular o código ao usuário." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Erro inesperado em link-invite-user:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao vincular código de convite." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
