"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export function LogoutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleLogout() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    await fetch("/auth/session", { method: "DELETE" });
    window.location.href = "/login";
  }

  return (
    <button
      className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={handleLogout}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out..." : "Logout"}
    </button>
  );
}
