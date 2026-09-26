import { Fragment } from "react";
import { redirect } from "next/navigation";
import { PageHeader, SettingsSubnav } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSetupComplete } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/session";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_CODES, ROLE_LABELS } from "@/lib/constants";

export const metadata = { title: "Roles" };

export default async function RolesPage() {
  const user = await requireSetupComplete();
  if (!hasPermission(user, "settings.manage") && !hasPermission(user, "user.view")) {
    redirect("/unauthorized");
  }

  const groups = Array.from(new Set(PERMISSIONS.map((p) => p.group)));

  return (
    <div>
      <PageHeader title="Roles and permissions" description="Phase 1 permission foundation. Custom role editing ships later." />
      <SettingsSubnav pathname="/settings/roles" />
      <Card>
        <CardHeader>
          <CardTitle>Permission matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2">Permission</th>
                {ROLE_CODES.map((code) => (
                  <th key={code} className="px-3 py-2 text-center">
                    {ROLE_LABELS[code]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr className="bg-slate-50">
                    <td className="px-3 py-2 font-semibold" colSpan={ROLE_CODES.length + 1}>
                      {group}
                    </td>
                  </tr>
                  {PERMISSIONS.filter((p) => p.group === group).map((perm) => (
                    <tr key={perm.code} className="border-b">
                      <td className="px-3 py-2">{perm.label}</td>
                      {ROLE_CODES.map((code) => (
                        <td key={code} className="px-3 py-2 text-center">
                          {DEFAULT_ROLE_PERMISSIONS[code].includes(perm.code) ? "Yes" : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
