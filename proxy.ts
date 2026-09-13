import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(undefined, {
  cookieConfig: {
    maxAge: 30 * 24 * 60 * 60, // 30 days persistent cookies
  },
});

export const config = {
  // Run proxy middleware on all routes except static assets
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

