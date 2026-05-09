import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/setup", "/api/auth", "/api/setup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and static assets through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for any company token
  const tokensCookie = req.cookies.get("storage_tokens");
  const hasToken =
    tokensCookie?.value && tokensCookie.value.length > 2; // "{}" = 2 chars

  if (!hasToken) {
    return NextResponse.redirect(new URL("/setup", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
