import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

export function ToastCard({ title, description, variant = "default" }: ToastProps) {
  const icons = {
    default: <Info className="w-5 h-5 text-primary" />,
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    destructive: <AlertCircle className="w-5 h-5 text-destructive" />,
  };

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl border p-4 flex gap-4 animate-in slide-in-from-right-8 fade-in duration-300",
        variant === "destructive" ? "border-destructive/20 bg-red-50/50" : "border-border/50"
      )}
    >
      <div className="mt-0.5 flex-shrink-0">{icons[variant]}</div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
