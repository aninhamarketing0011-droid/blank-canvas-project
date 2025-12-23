import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => null) as
      | { username?: string; success?: boolean }
      | null;

    if (!body || typeof body.username !== "string" || typeof body.success !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos. Informe username e success." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const username = body.username.trim();
    const success = body.success;

    if (!username) {
      return new Response(
        JSON.stringify({ error: "USERNAME inválido." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Busca perfil pelo username (case-insensitive)
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, failed_attempts, is_locked")
      .ilike("username", username)
      .maybeSingle();

    if (fetchError) {
      console.error("Erro ao buscar perfil em pin-login-telemetry:", fetchError);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar tentativa de acesso." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (!profile) {
      // Não vaza informação de existência de usuário; apenas retorna OK
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const now = new Date().toISOString();

    if (success) {
      // Zera tentativas e desbloqueia
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          failed_attempts: 0,
          is_locked: false,
          last_login_attempt: now,
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error("Erro ao atualizar perfil em sucesso de login:", updateError);
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const currentAttempts = profile.failed_attempts ?? 0;
    const newAttempts = currentAttempts + 1;
    const shouldLock = newAttempts >= 6;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        failed_attempts: newAttempts,
        is_locked: shouldLock,
        last_login_attempt: now,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Erro ao atualizar perfil em falha de login:", updateError);
      return new Response(
        JSON.stringify({ error: "Falha ao registrar tentativa de acesso." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, attempts: newAttempts, locked: shouldLock }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("Erro inesperado em pin-login-telemetry:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao registrar tentativa de acesso." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
