import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexCredentials, ConvexCredentialsUserConfig } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth } from "@convex-dev/auth/server";

interface ProviderWithOptions {
  options: ConvexCredentialsUserConfig;
}

const basePasswordProvider = Password();
const basePasswordOptions = (basePasswordProvider as unknown as ProviderWithOptions).options;

const customPasswordProvider = ConvexCredentials({
  ...basePasswordOptions,
  id: "password",
  authorize: async (params, ctx) => {
    // 1. Extract the custom token passed from your client-side form
    const token = typeof params.token === "string" ? params.token : undefined;
    const turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    // Allow bypassing Turnstile verification in non-production environments or when Turnstile secret is not set
    if (!token) {
      if (!isProduction || !turnstileSecret) {
        console.warn("Turnstile token missing in non-production environment; bypassing verification.");
        return basePasswordOptions.authorize(params, ctx);
      }
      throw new Error("Security verification token is missing.");
    }

    if (!turnstileSecret) {
      console.warn("CLOUDFLARE_TURNSTILE_SECRET not configured; bypassing verification.");
      return basePasswordOptions.authorize(params, ctx);
    }

    // 2. Build the request payload for the Turnstile verification endpoint
    const formData = new FormData();
    formData.append("secret", turnstileSecret);
    formData.append("response", token);

    const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const response = await fetch(verifyUrl, {
      method: "POST",
      body: formData,
    });

    const validationResult = (await response.json()) as { success: boolean; [key: string]: unknown };

    // 3. Halt the execution pipeline immediately if validation checks fail
    if (!validationResult.success) {
      console.error("Turnstile verification failed:", validationResult);
      throw new Error("CAPTCHA verification failed. Request blocked.");
    }
    
    console.log("Turnstile verification succeeded:", validationResult);

    // 4. Delegate to the original Password provider authorize function
    return basePasswordOptions.authorize(params, ctx);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [customPasswordProvider],
});


