import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const adminRoles = new Set(["it_super_user", "admin", "super_admin"]);
const customerCreatorRoles = new Set(["manager", "it_super_user", "admin", "super_admin"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return jsonResponse({}, 200);
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: "Function is not configured." }, 500);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse({ error: "Missing authorization." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authUser, error: authError } = await userClient.auth.getUser();
  if (authError || !authUser.user) return jsonResponse({ error: "Invalid session." }, 401);

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, role, is_active, full_name, email, employee_code, reporting_manager_id")
    .eq("id", authUser.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("profile-context profile lookup failed", profileError);
    return jsonResponse({ error: "Could not load profile context." }, 500);
  }

  if (!profile?.is_active) return jsonResponse({ error: "Inactive profile." }, 403);

  let managerName: string | null = null;
  if (profile.reporting_manager_id) {
    const { data: manager, error: managerError } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("id", profile.reporting_manager_id)
      .maybeSingle();
    if (managerError) console.error("profile-context manager lookup failed", managerError);
    managerName = manager?.full_name ?? null;
  }

  let assignableAgents: unknown[] = [];
  const role = String(profile.role);
  if (customerCreatorRoles.has(role)) {
    if (adminRoles.has(role)) {
      const { data, error } = await serviceClient
        .from("profiles")
        .select("id, full_name, employee_code, role, is_active")
        .eq("role", "agent")
        .eq("is_active", true)
        .order("full_name");
      if (error) {
        console.error("profile-context admin agent lookup failed", error);
        return jsonResponse({ error: "Could not load assignable agents." }, 500);
      }
      assignableAgents = data ?? [];
    } else if (role === "manager") {
      const rootUserId = profile.reporting_manager_id ?? profile.id;
      const { data: downline, error: downlineError } = await serviceClient.rpc("get_user_downline", { root_user_id: rootUserId });
      if (downlineError) {
        console.error("profile-context manager downline lookup failed", downlineError);
        return jsonResponse({ error: "Could not load assignable agents." }, 500);
      }
      const ids = Array.isArray(downline) ? downline.map((row: { profile_id: string }) => row.profile_id) : [];
      if (ids.length) {
        const { data, error } = await serviceClient
          .from("profiles")
          .select("id, full_name, employee_code, role, is_active")
          .in("id", ids)
          .eq("role", "agent")
          .eq("is_active", true)
          .order("full_name");
        if (error) {
          console.error("profile-context manager agent lookup failed", error);
          return jsonResponse({ error: "Could not load assignable agents." }, 500);
        }
        assignableAgents = data ?? [];
      }
    }
  }

  return jsonResponse({
    manager_name: managerName,
    assignable_agents: assignableAgents,
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
