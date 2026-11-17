import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { SignOutButton } from "./sign-out-button";

// Every page in this group depends on the session cookie, so it must never
// be statically prerendered.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold text-foreground">
            Steadfast
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-muted hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/settings" className="text-muted hover:text-foreground">
              Settings
            </Link>
            <Link href="/log" className="text-muted hover:text-foreground">
              Activity
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
