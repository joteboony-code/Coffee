import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "coff_session";
const STAFF_PAGES = new Set(["/pos", "/sales"]);
const PUBLIC_PATHS = new Set(["/"]);

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-change-me"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

async function roleFromToken(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if ((await sign(payload)) !== signature) return null;
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as {
      role?: string;
      exp?: number;
    };
    if (!session.exp || session.exp < Date.now()) return null;
    return session.role === "OWNER" || session.role === "STAFF" ? session.role : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const role = await roleFromToken(request.cookies.get(AUTH_COOKIE)?.value);

  if (!role) {
    const url = new URL("/", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (role === "STAFF") {
    const allowed =
      STAFF_PAGES.has(pathname) ||
      pathname.startsWith("/receipt/") ||
      pathname.startsWith("/sales");
    if (!allowed) return NextResponse.redirect(new URL("/pos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
