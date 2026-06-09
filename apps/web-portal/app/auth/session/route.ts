import { NextResponse } from "next/server";
import { accessTokenCookie, refreshTokenCookie } from "@/lib/auth-config";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export async function POST(request: Request) {
  const body = (await request.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };

  if (!body.access_token || !body.refresh_token) {
    return NextResponse.json({ error: "Missing session tokens" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessTokenCookie, body.access_token, {
    ...cookieOptions,
    maxAge: body.expires_in ?? 60 * 60
  });
  response.cookies.set(refreshTokenCookie, body.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessTokenCookie, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(refreshTokenCookie, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
