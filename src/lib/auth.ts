import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";

export type Role = "OWNER" | "STAFF";
export type Session = { role: Role; exp: number };

export const AUTH_COOKIE = "coff_session";
const SESSION_HOURS = 12;

function secret() {
  return process.env.AUTH_SECRET || "dev-only-change-me";
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(role: Role) {
  const session: Session = { role, exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 };
  const payload = base64Url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!["OWNER", "STAFF"].includes(session.role)) return null;
    if (!Number.isFinite(session.exp) || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(AUTH_COOKIE)?.value);
}

export async function requireSession(allowedRoles?: Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/");
  if (allowedRoles && !allowedRoles.includes(session.role)) redirect("/pos");
  return session;
}

export async function setSession(role: Role) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, createSessionToken(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export function roleFromPin(pin: string): Role | null {
  if (pin === (process.env.OWNER_PIN ?? "1234")) return "OWNER";
  if (pin === (process.env.STAFF_PIN ?? "0000")) return "STAFF";
  return null;
}

export function roleLabel(role: Role) {
  return role === "OWNER" ? "เจ้าของร้าน" : "พนักงาน";
}
