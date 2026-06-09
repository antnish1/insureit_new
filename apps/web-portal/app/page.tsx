import { redirect } from "next/navigation";
import { getAuthenticatedProfile, getServerAccessToken, isAuthorizedProfile } from "@/lib/auth-server";

export default async function Home() {
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    redirect("/login");
  }

  const { profile } = await getAuthenticatedProfile(accessToken);

  if (!isAuthorizedProfile(profile)) {
    redirect("/access-denied");
  }

  redirect("/dashboard");
}
