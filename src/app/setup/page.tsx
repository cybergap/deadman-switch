import { redirect } from "next/navigation";
import { hasAdminUser } from "@/lib/auth";
import { SetupForm } from "./setup-form";

// Whether an admin exists can change between build and request, so this
// must never be statically prerendered with a baked-in redirect decision.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasAdminUser()) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Set up Steadfast</h1>
          <p className="mt-2 text-sm text-muted">
            Create the one admin account that controls this deadman switch.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
