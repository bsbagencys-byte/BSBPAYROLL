"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SUPPORT_NAV, DATA_EXPORT_NAV, MIGRATION_NAV, SUPPORT_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

function Nav({ items }: { items: readonly { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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

export function SupportSubnav() {
  return <Nav items={SUPPORT_NAV} />;
}

export function AdminSupportSubnav() {
  return <Nav items={ADMIN_SUPPORT_NAV} />;
}

export function MigrationSubnav() {
  return <Nav items={MIGRATION_NAV} />;
}

export function DataExportSubnav() {
  return <Nav items={DATA_EXPORT_NAV} />;
}
