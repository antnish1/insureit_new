"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, getAuthenticatedProfile, getServerAccessToken } from "@/lib/auth-server";

export async function markCustomerActivitySeen(formData: FormData) {
  await updateStatus(formData, "seen");
}

export async function markCustomerActivityInProgress(formData: FormData) {
  await updateStatus(formData, "in_progress");
}

export async function markCustomerActivityHandled(formData: FormData) {
  await updateStatus(formData, "handled");
}

async function updateStatus(formData: FormData, status: "seen" | "in_progress" | "handled") {
  const activityId = String(formData.get("activityId") ?? "").trim();
  if (!activityId) return;

  const accessToken = await getServerAccessToken();
  const { profile } = await getAuthenticatedProfile(accessToken);
  if (!profile?.id) return;

  const supabase = await createServerSupabaseClient();
  const payload = status === "handled"
    ? { status, handled_by: profile.id, handled_at: new Date().toISOString() }
    : { status };

  await supabase.from("customer_activity_events").update(payload).eq("id", activityId);
  revalidatePath("/dashboard");
}
