import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ThreadsAuthAPI } from "./lib/threads/api";
import { auth } from "./auth";

const http = httpRouter();

async function verifyState(stateStr: string, secret: string): Promise<Id<"users"> | null> {
  try {
    const parts = stateStr.split(":");
    if (parts.length !== 3) return null;
    
    const [userId, timestampStr, signatureHex] = parts;
    const timestamp = Number(timestampStr);
    
    // Check expiration (1 hour)
    if (isNaN(timestamp) || Date.now() - timestamp > 3600000 || Date.now() - timestamp < -60000) {
      return null;
    }
    
    const dataToSign = `${userId}:${timestampStr}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(dataToSign);
    
    // Convert hex string back to Uint8Array
    const sigBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
    return isValid ? (userId as Id<"users">) : null;
  } catch (err) {
    console.error("Error verifying state:", err);
    return null;
  }
}

http.route({
  path: "/auth",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const stateStr = url.searchParams.get("state") || "";
    const clientSecret = process.env.THREADS_APP_SECRET;

    if (!clientSecret) {
      return new Response("Threads API configurations are missing in the environment variables", { status: 500 });
    }

    const userId = await verifyState(stateStr, clientSecret);

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
    const redirectUri = process.env.THREADS_REDIRECT_URI;

    if (!clientId || !redirectUri) {
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
