import { redirect } from "next/navigation";
import { getSessionUser, hasPermission } from "@/lib/auth/session";
import type { PermissionCode } from "@/lib/constants";
import type { SessionUser } from "@/types";

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSetupComplete(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.organization.setup_completed) redirect("/setup");
  return user;
}

export async function requirePermissionOrRedirect(permission: PermissionCode): Promise<SessionUser> {
  const user = await requireSetupComplete();
  if (!hasPermission(user, permission)) redirect("/unauthorized");
  return user;
}
