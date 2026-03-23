import { useState, useEffect } from "react";

export type ToastType = "default" | "success" | "destructive";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastType;
}

let count = 0;
let toasts: Toast[] = [];
const listeners = new Set<(toasts: Toast[]) => void>();

export const toast = (t: Omit<Toast, "id">) => {
  const id = (++count).toString();
  toasts = [...toasts, { ...t, id }];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== id);
    listeners.forEach((l) => l(toasts));
  }, 4000);
};

export const useToast = () => {
  const [state, setState] = useState(toasts);
  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return { toasts: state, toast };
};
