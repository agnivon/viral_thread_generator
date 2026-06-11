import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ThreadsAuthAPI } from "./lib/ThreadsAPI";
import { auth } from "./auth";

const http = httpRouter();

http.route({
  path: "/auth",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const userId = await auth.getUserId(ctx);

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    let code = url.searchParams.get("code");
    if (code) {
      code = code.replace(/#_$/, "");
    }

    // 1. Handle user canceling or missing authorization code
    if (!code) {
      const error = url.searchParams.get("error") || "Authorization code is missing";
      const errorDesc = url.searchParams.get("error_description") || "";
      return new Response(
        `<html>
          <head><title>Authorization Failed</title></head>
          <body style="font-family: sans-serif; padding: 2rem; background: #fafafa; color: #333;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #d32f2f; margin-top: 0;">Authorization Failed</h2>
              <p><strong>Error:</strong> ${error}</p>
              ${errorDesc ? `<p><strong>Details:</strong> ${errorDesc}</p>` : ""}
              <p style="color: #666; font-size: 0.9rem;">You can close this window and try again.</p>
            </div>
          </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    const clientId = process.env.THREADS_APP_ID;
    const clientSecret = process.env.THREADS_APP_SECRET;
    const redirectUri = process.env.THREADS_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return new Response("Threads API configurations are missing in the environment variables", { status: 500 });
    }

    try {
      // 2. Exchange authorization code for a short-lived access token
      const shortLivedData = await ThreadsAuthAPI.getShortLivedToken(
        clientId,
        clientSecret,
        redirectUri,
        code
      );

      // 3. Exchange short-lived access token for a long-lived access token
      const longLivedData = await ThreadsAuthAPI.exchangeForLongLivedToken(
        clientSecret,
        shortLivedData.access_token
      );

      // 4. Delete existing tokens for the platform to avoid duplicates
      await ctx.runMutation(internal.mutations.tokensMutations.deleteTokensByPlatform, {
        platform: "threads",
        userId: userId,
      });

      // 5. Store both tokens singularly in the database
      await ctx.runMutation(internal.mutations.tokensMutations.storeAuthToken, {
        userId: userId,
        platformUserId: String(shortLivedData.user_id),
        platform: "threads",
        token: shortLivedData.access_token,
        type: "short lived",
        active: false,
        expiresIn: 3600, // typically 1 hour
      });

      await ctx.runMutation(internal.mutations.tokensMutations.storeAuthToken, {
        userId: userId,
        platformUserId: String(shortLivedData.user_id),
        platform: "threads",
        token: longLivedData.access_token,
        type: "long lived",
        active: true,
        expiresIn: longLivedData.expires_in,
      });

      // 5. Output a friendly success page to the user
      return new Response(
        `<html>
          <head><title>Authorization Successful</title></head>
          <body style="font-family: sans-serif; padding: 2rem; background: #fafafa; color: #333;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #388e3c; margin-top: 0;">Authorization Successful!</h2>
              <p>Your Threads account has been successfully linked. The access tokens have been stored securely.</p>
              <p style="color: #666; font-size: 0.9rem;">You may now close this window.</p>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    } catch (error: any) {
      return new Response(
        `<html>
          <head><title>Exchange Failed</title></head>
          <body style="font-family: sans-serif; padding: 2rem; background: #fafafa; color: #333;">
            <div style="max-width: 500px; margin: auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #d32f2f; margin-top: 0;">Exchange Failed</h2>
              <p>An error occurred while exchanging the authorization code for access tokens.</p>
              <p style="color: #d32f2f;"><strong>Details:</strong> ${error.message || error}</p>
              <p style="color: #666; font-size: 0.9rem;">Please try authorizing again.</p>
            </div>
          </body>
        </html>`,
        {
          status: 500,
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  }),
});

auth.addHttpRoutes(http);

export default http;
