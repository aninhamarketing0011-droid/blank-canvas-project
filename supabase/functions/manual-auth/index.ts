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

    const username = body.username.trim();
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
      return new Response(
        JSON.stringify({ error: "Registro via manual-auth não suportado. Use o fluxo padrão de cadastro." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (body.action === "login") {
      // 1) Localiza o perfil pelo username (case-insensitive)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, username, pin_hash")
        .ilike("username", username)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        return new Response(
          JSON.stringify({ error: "Falha ao buscar usuário" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (!profile) {
        return new Response(
          JSON.stringify({ error: "Usuário ou PIN inválidos" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      // 2) Se ainda não existe PIN gravado nesse perfil, esse primeiro login define o PIN
      if (!profile.pin_hash) {
        const salt = genSaltSync(10);
        const pinHash = hashSync(pin, salt);

        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ pin_hash: pinHash })
          .eq("id", profile.id);

        if (updateError) {
          console.error("Erro ao definir PIN no perfil:", updateError);
          return new Response(
            JSON.stringify({ error: "Falha ao registrar PIN" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      } else {
        // 3) Se já existe PIN, valida
        const isValid = compareSync(pin, profile.pin_hash);
        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Usuário ou PIN inválidos" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }
      }

      // 4) Descobre o papel principal desse usuário a partir de user_roles
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id);

      if (rolesError) {
        console.error("Erro ao buscar roles:", rolesError);
      }

      const primaryRole = roles && roles.length > 0 ? roles[0].role : "client";

      const token = generateToken();

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: profile.id,
            username: profile.username ?? username,
            role: primaryRole,
          },
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
