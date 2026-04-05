import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, action } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email.toLowerCase().endsWith("@zuper.co")) {
      return new Response(
        JSON.stringify({ error: "Only @zuper.co email addresses are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle deactivate/reactivate
    if (action === "deactivate" || action === "reactivate") {
      const targetIsActive = action === "reactivate";

      // Find user by email
      const { data: targetUser } = await serviceClient
        .from("users")
        .select("id, is_active")
        .eq("email", email)
        .single();

      if (!targetUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Last-admin protection for deactivation
      if (action === "deactivate") {
        const { count } = await serviceClient
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);

        if ((count ?? 0) <= 1) {
          return new Response(
            JSON.stringify({ error: "At least one admin must remain active." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Ban user in Supabase Auth
        await serviceClient.auth.admin.updateUserById(targetUser.id, {
          ban_duration: "876000h", // ~100 years
        });
      } else {
        // Unban user
        await serviceClient.auth.admin.updateUserById(targetUser.id, {
          ban_duration: "none",
        });
      }

      // Update users table
      await serviceClient
        .from("users")
        .update({ is_active: targetIsActive })
        .eq("id", targetUser.id);

      // Audit log
      await serviceClient.from("audit_log").insert({
        user_id: caller.id,
        action_type: action === "deactivate" ? "user.deactivate" : "user.reactivate",
        entity_type: "user",
        entity_id: targetUser.id,
        before_state: { is_active: !targetIsActive },
        after_state: { is_active: targetIsActive },
        details: { email, performed_by: caller.email },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default action: invite
    const { data: inviteData, error: inviteErr } =
      await serviceClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")}/login`,
      });

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit log
    await serviceClient.from("audit_log").insert({
      user_id: caller.id,
      action_type: "user.invite",
      entity_type: "user",
      entity_id: inviteData.user?.id ?? null,
      after_state: { email },
      details: { email, invited_by: caller.email },
    });

    return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
