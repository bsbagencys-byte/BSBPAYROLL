import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-sm font-bold text-white">
        BSB
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">BSB Payroll</div>
          <div className="text-[11px] text-slate-500">Workforce operations</div>
        </div>
      )}
    </div>
  );
}
