import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border-2 bg-background px-4 py-3 text-sm text-foreground transition-all duration-200 resize-y",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-4 focus:border-primary",
          error ? "border-destructive focus:ring-destructive/20 focus:border-destructive" : "border-border focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
