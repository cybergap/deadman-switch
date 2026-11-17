import { redirect } from "next/navigation";
import { getSessionUserId, hasAdminUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

// Auth state can change between build and request, so this must never be
// statically prerendered with a baked-in redirect decision.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await hasAdminUser())) {
    redirect("/setup");
  }
  if (await getSessionUserId()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Steadfast</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your deadman switch.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
