"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function initiateThreadsAuth() {
  const appId = process.env.THREADS_APP_ID;
  const redirectUri = process.env.THREADS_REDIRECT_URI;
  
  if (!appId || !redirectUri) {
    throw new Error("Missing Threads App configuration in environment variables");
  }

  // The requested scopes for Threads integration
  const scope = "threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies,threads_read_replies,threads_keyword_search,threads_manage_mentions,threads_delete,threads_location_tagging,threads_profile_discovery";
  
  // Generate a secure random state string
  const state = crypto.randomUUID();

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
