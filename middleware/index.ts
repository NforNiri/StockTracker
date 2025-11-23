import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/better-auth/auth";

export async function middleware(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    // No valid session → redirect to sign-in
    if (!session || !session.user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Optionally, enforce user status checks here (inactive, revoked, etc.)

    return NextResponse.next();
  } catch (error) {
    // Treat any verification error as an invalid session
    console.error("Middleware session verification failed:", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|assets).*)",
  ],
};
