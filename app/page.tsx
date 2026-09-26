import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.organization.setup_completed) redirect("/setup");
  redirect("/dashboard");
}
