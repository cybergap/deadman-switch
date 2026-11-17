import Link from "next/link";
import { confirmByToken } from "@/lib/checkin";

export const dynamic = "force-dynamic";

export default async function ConfirmCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let heading = "Invalid link";
  let body = "This check-in link is missing a token.";
  let tone: "ok" | "error" = "error";

  if (token) {
    const result = await confirmByToken(token);
    if (result.ok) {
      heading = "You're checked in";
      body = "Thanks for confirming you're OK. Your next check-in has been scheduled.";
      tone = "ok";
    } else if (result.reason === "already_used") {
      heading = "Already confirmed";
      body = "This check-in link was already used. You're all set.";
      tone = "ok";
    } else {
      heading = "Invalid link";
      body = "This check-in link isn't valid. If you still need to check in, open your dashboard.";
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
            tone === "ok" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
          }`}
        >
          {tone === "ok" ? "✓" : "!"}
        </div>
        <h1 className="text-lg font-semibold text-foreground">{heading}</h1>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
