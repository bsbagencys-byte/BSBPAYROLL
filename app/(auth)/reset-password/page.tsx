import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; username?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Logo />
          <CardTitle className="mt-4">Reset password</CardTitle>
          <CardDescription>Choose a new password that meets the security policy.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={params.token ?? ""} username={params.username ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
