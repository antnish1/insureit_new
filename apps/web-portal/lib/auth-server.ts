import { cookies } from "next/headers";
import { accessTokenCookie } from "./auth-config";
import { createSupabaseWithAccessToken, getAuthenticatedProfile, isAuthorizedProfile } from "./auth";

export async function getServerAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(accessTokenCookie)?.value;
}

export async function createServerSupabaseClient() {
  return createSupabaseWithAccessToken(await getServerAccessToken());
}

export { getAuthenticatedProfile, isAuthorizedProfile };
