"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { REPORTS_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ReportsSubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const group = searchParams.get("group");
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {REPORTS_NAV.map((item) => {
        const hrefGroup = item.href.includes("group=") ? item.href.split("group=")[1] : null;
        const active =
          item.href === "/reports"
            ? pathname === "/reports" && !group
            : pathname === "/reports" && group === hrefGroup;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              active
                ? "border-brand-700 bg-brand-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
