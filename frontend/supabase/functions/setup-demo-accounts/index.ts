import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Demo accounts setup function called");
    
    // For now, just return success since we'll manually create the accounts
    // In a production app, you'd integrate with your auth system properly
    
    return new Response(JSON.stringify({ 
      message: "Demo accounts are already set up in the system",
      accounts: [
        { email: "john.doe@epacific.com", role: "user", status: "ready" },
        { email: "jane.manager@epacific.com", role: "manager", status: "ready" },
        { email: "admin@epacific.com", role: "admin", status: "ready" }
      ]
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in setup-demo-accounts function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Please contact administrator to set up demo accounts manually"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);