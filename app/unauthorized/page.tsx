import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Logo />
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="max-w-sm text-center text-sm text-slate-500">
        You do not have permission to view this page. Contact your organization administrator if you believe this is a mistake.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"
        >
          Dashboard
        </Link>
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
