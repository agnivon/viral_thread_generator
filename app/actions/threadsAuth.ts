"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

function getUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );
    if (!payload.sub) return null;
    return payload.sub.split("|")[0];
  } catch (err) {
    console.error("Error decoding token:", err);
    return null;
  }
}

async function signState(userId: string, secret: string): Promise<string> {
  const timestamp = Date.now();
  const dataToSign = `${userId}:${timestamp}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(dataToSign);
  
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto;
  
  const key = await cryptoObj.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await cryptoObj.subtle.sign("HMAC", key, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${dataToSign}:${signatureHex}`;
}

export async function initiateThreadsAuth() {
  const appId = process.env.THREADS_APP_ID;
  const redirectUri = process.env.THREADS_REDIRECT_URI;
  const appSecret = process.env.THREADS_APP_SECRET;
  
  if (!appId || !redirectUri || !appSecret) {
    throw new Error("Missing Threads App configuration in environment variables");
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    throw new Error("Unauthorized: You must be signed in to link your Threads account");
  }

  const userId = getUserIdFromToken(token);
  if (!userId) {
    throw new Error("Unauthorized: Invalid session token");
  }

  // The requested scopes for Threads integration
  const scope = "threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies,threads_keyword_search,threads_manage_mentions,threads_delete,threads_location_tagging,threads_profile_discovery";
  
  // Generate a secure signed state string containing user ID and timestamp
  const state = await signState(userId, appSecret);

  // Store the state in an HTTP-only, secure cookie that expires in 1 hour
  (await cookies()).set("threads_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 3600,
  });

  // Construct the authorization URL
  const authUrl = new URL("https://threads.net/oauth/authorize");
  authUrl.searchParams.append("client_id", appId);
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("scope", scope);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("state", state);

  // Redirect the user to Threads authorization page
  redirect(authUrl.toString());
}
