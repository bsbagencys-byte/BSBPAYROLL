import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Logo />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-center text-sm text-slate-500">
        The page you requested does not exist or has not been built yet.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
