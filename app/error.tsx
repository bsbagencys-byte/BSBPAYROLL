"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            An unexpected error occurred. Try again, or return to the dashboard.
          </p>
          <p className="rounded-md bg-slate-50 p-2 font-mono text-xs text-slate-500">
            {error.message || "Unknown error"}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
