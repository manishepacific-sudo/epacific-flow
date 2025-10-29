import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clear HttpOnly cookies
    const response = new Response(
      JSON.stringify({ message: "Logged out successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

    // Clear cookies by setting them to expire
    response.headers.set('Set-Cookie', [
      'sb-access-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
      'sb-refresh-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ].join(', '));

    return response;

  } catch (error: any) {
    console.error("Error in auth-logout function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);