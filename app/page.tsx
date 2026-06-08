import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-foreground">
          Viral Thread Generator
        </h1>
        <p className="text-xl text-muted-foreground">
          Create engaging, viral Twitter and LinkedIn threads in seconds. Sign in to start building your audience.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
