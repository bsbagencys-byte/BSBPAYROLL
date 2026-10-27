"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SUBSCRIPTION_NAV, BILLING_NAV, SETTINGS_SUBSCRIPTION_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

function Nav({ items, exact }: { items: readonly { href: string; label: string }[]; exact?: string }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active =
          exact && item.href === exact
            ? pathname === item.href
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

export function BillingSubnav() {
  return <Nav items={BILLING_NAV} />;
}

export function AdminSubscriptionSubnav() {
  return <Nav items={ADMIN_SUBSCRIPTION_NAV} exact="/admin/subscriptions" />;
}

export function SettingsSubscriptionSubnav() {
  return <Nav items={SETTINGS_SUBSCRIPTION_NAV} />;
}
