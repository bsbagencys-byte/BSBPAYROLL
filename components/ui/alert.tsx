import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "error",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "error" | "success" | "info" }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  }[variant];
  return <div className={cn("rounded-md border px-3 py-2 text-sm", styles, className)} {...props} />;
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600">{children}</p>;
}
