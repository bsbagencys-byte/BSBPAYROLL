import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/app-shell";
import { ProfileView } from "@/components/profile/profile-view";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div>
      <PageHeader title="Profile" description="Your account details for this organization." />
      <ProfileView user={user} />
    </div>
  );
}
