import { redirect } from "next/navigation";
import { getSessionUserId, hasAdminUser } from "@/lib/auth";

// Auth state can change between build and request, so this must never be
// statically prerendered with a baked-in redirect decision.
export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await hasAdminUser())) {
    redirect("/setup");
  }
  if (!(await getSessionUserId())) {
    redirect("/login");
  }
  redirect("/dashboard");
}
