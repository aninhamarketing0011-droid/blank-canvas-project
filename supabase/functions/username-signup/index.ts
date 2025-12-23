// Deprecated: old username-signup edge function kept only for backward compatibility.
// New auth flow uses direct supabase.auth.signUp with username + PIN abstraction.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error:
        "Esta função não é mais utilizada. O cadastro agora é feito diretamente via supabase.auth.signUp no frontend.",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
});
