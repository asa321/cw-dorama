import { createCookie, redirect } from "@remix-run/cloudflare";
import type { Session } from "./db.server";

// cookie for a week
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const sessionCookie = createCookie(
  process.env.NODE_ENV === "production" ? "__Host-admin-session" : "admin-session",
  {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
  }
);

export async function createAdminSession(db: any, adminId: number, userAgent: string | null = null, ip: string | null = null) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toISOString();

  await db.prepare(
    "INSERT INTO sessions (id, admin_id, user_agent, ip, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(sessionId, adminId, userAgent, ip, expiresAt).run();

  return sessionCookie.serialize(sessionId);
}

export async function destroyAdminSession(db: any, request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const sessionId = await sessionCookie.parse(cookieHeader);

  if (sessionId) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }

  return sessionCookie.serialize("", { maxAge: 0 });
}

export async function getAdminSession(db: any, request: Request): Promise<Session | null> {
  const cookieHeader = request.headers.get("Cookie");
  const sessionId = await sessionCookie.parse(cookieHeader);

  if (!sessionId) {
    return null;
  }

  const session = await db.prepare(
    "SELECT * FROM sessions WHERE id = ? AND (expires_at > CURRENT_TIMESTAMP OR expires_at IS NULL)"
  ).bind(sessionId).first() as Session | null;

  return session;
}

export async function requireAdminSession(db: any, request: Request) {
  const session = await getAdminSession(db, request);

  if (!session) {
    // Instead of throwing a bare redirect which might not clear the cookie if invalid,
    // we just throw to login. We can try to clear cookie if they had a session ID but it's invalid.
    const cookieHeader = request.headers.get("Cookie");
    const sessionId = await sessionCookie.parse(cookieHeader);

    if (sessionId) {
      throw redirect("/admin/login", {
        headers: {
          "Set-Cookie": await sessionCookie.serialize("", { maxAge: 0 }),
        },
      });
    }

    throw redirect("/admin/login");
  }

  return session;
}
