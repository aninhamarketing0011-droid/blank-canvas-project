import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { genSaltSync, hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface AuthRequest {
  action: "login" | "register";
  username: string;
  pin: string;
}

function generateToken() {
  return crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => null)) as AuthRequest | null;

    if (!body || !body.username || !body.pin || !body.action) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const username = body.username.trim().toLowerCase();
    const pin = body.pin.trim();

    if (pin.length < 4 || pin.length > 10) {
      return new Response(
        JSON.stringify({ error: "PIN inválido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (body.action === "register") {
      const salt = genSaltSync(10);
      const pinHash = hashSync(pin, salt);

      const { data, error } = await supabaseAdmin
        .from("users")
        .insert({ username, pin_hash: pinHash })
        .select("id, username, role")
        .single();

      if (error) {
        console.error("Erro ao registrar usuário:", error);
        return new Response(
          JSON.stringify({ error: "Falha ao registrar usuário" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const token = generateToken();
      const { error: sessionError } = await supabaseAdmin
        .from("sessions")
        .insert({ user_id: data.id, token });

      if (sessionError) {
        console.error("Erro ao criar sessão:", sessionError);
      }

      return new Response(
        JSON.stringify({
          token,
          user: { id: data.id, username: data.username, role: data.role },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (body.action === "login") {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, username, role, pin_hash")
        .eq("username", username)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar usuário:", error);
        return new Response(
          JSON.stringify({ error: "Falha ao buscar usuário" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (!data || !data.pin_hash) {
        return new Response(
          JSON.stringify({ error: "Usuário ou PIN inválidos" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const isValid = compareSync(pin, data.pin_hash);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Usuário ou PIN inválidos" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const token = generateToken();
      const { error: sessionError } = await supabaseAdmin
        .from("sessions")
        .insert({ user_id: data.id, token });

      if (sessionError) {
        console.error("Erro ao criar sessão:", sessionError);
      }

      return new Response(
        JSON.stringify({
          token,
          user: { id: data.id, username: data.username, role: data.role },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Erro inesperado em manual-auth:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
