"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  Palmtree,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { NAV_ITEMS, SETTINGS_NAV } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import type { SessionUser } from "@/types";

const ICONS = {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Palmtree,
  Fingerprint,
  Wallet,
  BarChart3,
  ShieldCheck,
  Settings,
} as const;

const NAV = NAV_ITEMS;

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const company = user.organization.display_name || user.organization.name;
  const setupExempt = pathname === "/setup" || pathname.startsWith("/setup") || pathname === "/profile";

  useEffect(() => {
    if (!user.organization.setup_completed && !setupExempt) {
      router.replace("/setup");
    }
  }, [user.organization.setup_completed, setupExempt, router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.href.startsWith("/settings")
              ? pathname.startsWith("/settings")
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            if (!item.enabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-slate-400"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <Badge variant="muted">Soon</Badge>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close overlay"
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold">{company}</p>
              <p className="text-xs text-slate-500">{user.organization.currency} · {user.organization.timezone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge>{user.roleName}</Badge>
            <button className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <Link href="/profile" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
                {initials(user.displayName)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs text-slate-500">@{user.username}</p>
              </div>
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function SettingsSubnav({ pathname }: { pathname: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {SETTINGS_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-full border px-3 py-1 text-sm",
            pathname === item.href
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
      Loading...
    </div>
  );
}
