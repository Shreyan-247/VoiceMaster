import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isOrgSelectionRoute = createRouteMatcher(["/org-selection(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Check public route FIRST to bypass Clerk overhead on public pages
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 2. Fetch auth state ONLY for routes that actually need it
  const { userId, orgId } = await auth();

  // 3. Protect route if there's no user (use await, not return)
  if (!userId) {
    await auth.protect();
  }

  // 4. Bypass org check if they are already on the org selection route
  if (isOrgSelectionRoute(req)) {
    return NextResponse.next();
  }

  // 5. Force org selection if logged in but no org is selected
  if (userId && !orgId) {
    const url = new URL("/org-selection", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
}