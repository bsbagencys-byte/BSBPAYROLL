"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Bell,
  CalendarCheck,
  FileText,
  HandCoins,
  Inbox,
  LayoutDashboard,
  Palmtree,
  Receipt,
  ShieldCheck,
  UserCircle,
  Wallet,
} from "lucide-react";
import { ESS_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS = {
  LayoutDashboard,
  UserCircle,
  CalendarCheck,
  Palmtree,
  Receipt,
  Banknote,
  Wallet,
  HandCoins,
  FileText,
  ShieldCheck,
  Inbox,
  Bell,
} as const;

export function EssSubnav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
      {ESS_NAV.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === "/my" ? pathname === "/my" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
              active ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
            {item.href === "/my/notifications" && unreadCount > 0 ? (
              <span className="ml-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">{unreadCount}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
