import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { APP_TAGLINE } from "@/lib/constants";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-900 p-10 text-white lg:flex">
        <Logo className="[&_div]:text-white [&_div_div:last-child]:text-blue-200" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">BSB Payroll</h1>
          <p className="mt-3 max-w-md text-sm text-blue-100">{APP_TAGLINE} Phase 1 foundation for multi-tenant workforce operations.</p>
        </div>
        <p className="text-xs text-blue-200">Secure username access. Passwords are never stored in plaintext.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 lg:hidden">
              <Logo />
            </div>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your username and password. Email is not required.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
