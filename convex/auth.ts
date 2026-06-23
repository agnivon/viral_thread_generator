import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const basePasswordProvider = Password();

const customPasswordProvider = {
  ...basePasswordProvider,
  async authorize(params: Record<string, any>, ctx: any) {
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
      throw new Error("CAPTCHA verification failed. Request blocked.");
    }

    // 4. Delegate to the original Password provider authorize function
    return basePasswordProvider.authorize(params, ctx);
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [customPasswordProvider],
});


