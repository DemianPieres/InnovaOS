import { NextRequest, NextResponse } from "next/server";

const SYSTEM_TOKEN_COOKIE = "innovaos_token";
const MAXADMIN_TOKEN_COOKIE = "innovaos_maxadmin_token";

/**
 * Determina si una ruta es pública (no requiere autenticación).
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login") return true;
  if (pathname.startsWith("/menu/")) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/api/auth/refresh")) return true;
  if (pathname.startsWith("/api/menu/")) return true;
  if (pathname.startsWith("/api/orders/public")) return true;
  if (pathname.startsWith("/api/customers/public")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/maxadmin/login")) return true;
  if (pathname.startsWith("/maxadmin/api/auth/login")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/static") || pathname === "/robots.txt") return true;
  return false;
}

/**
 * Middleware de Next.js. Solo verifica presencia de cookie y separa contextos.
 * La verificación criptográfica del JWT se hace en cada API route (Node runtime).
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isMaxAdminRoute =
    pathname.startsWith("/maxadmin") || pathname.startsWith("/maxadmin/api");
  const isSystemApiRoute =
    pathname.startsWith("/api") && !pathname.startsWith("/maxadmin");
  const isSystemPanelRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/operations");

  const systemToken = req.cookies.get(SYSTEM_TOKEN_COOKIE)?.value;
  const maxadminToken = req.cookies.get(MAXADMIN_TOKEN_COOKIE)?.value;

  if (isMaxAdminRoute) {
    if (!maxadminToken) {
      if (pathname.startsWith("/maxadmin/api")) {
        return NextResponse.json(
          { error: "Token MAXADMIN requerido", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/maxadmin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isSystemApiRoute) {
    if (!systemToken) {
      return NextResponse.json(
        { error: "Token requerido", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (isSystemPanelRoute) {
    if (!systemToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
