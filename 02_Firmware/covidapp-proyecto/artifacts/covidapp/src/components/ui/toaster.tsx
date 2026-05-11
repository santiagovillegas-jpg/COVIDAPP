import { useToast } from "@/hooks/use-toast";
import { ToastCard } from "./toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} title={t.title} description={t.description} variant={t.variant} />
      ))}
    </div>
  );
}
