"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BIOMETRIC_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function BiometricSubnav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {BIOMETRIC_NAV.map((item) => {
        const active =
          item.href === "/biometric"
            ? pathname === "/biometric"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
