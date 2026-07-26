import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth } from "@convex-dev/auth/server";

const basePasswordProvider = Password();
const basePasswordOptions = (basePasswordProvider as any).options;

const customPasswordProvider = ConvexCredentials({
  ...basePasswordOptions,
  id: "password",
  authorize: async (params: Record<string, any>, ctx: any) => {
    // 1. Extract the custom token passed from your client-side form
    const token = params.token as string;

    if (!token) {
      throw new Error("Security verification token is missing.");
    }

    // 2. Build the request payload for the Turnstile verification endpoint
    const formData = new FormData();
    formData.append("secret", process.env.CLOUDFLARE_TURNSTILE_SECRET!);
    formData.append("response", token);

    const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const response = await fetch(verifyUrl, {
      method: "POST",
      body: formData,
    });

    const validationResult = await response.json();

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


