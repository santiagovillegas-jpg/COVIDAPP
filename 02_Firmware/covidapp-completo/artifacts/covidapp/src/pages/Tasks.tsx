import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}/api/tasks${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: "En progreso", color: "bg-blue-100 text-blue-700", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  completed: { label: "Completada", color: "bg-green-100 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
};

export default function Tasks() {
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => api("/my").then(r => r.json()),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Tarea actualizada" });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
  });

  const pending = tasks.filter((t: any) => t.status !== "completed");
  const completed = tasks.filter((t: any) => t.status === "completed");

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Mis Tareas de Terapia</h1>
        <p className="text-muted-foreground text-sm">Actividades asignadas por tu terapeuta para tu proceso de rehabilitación.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-yellow-600">{pending.length}</p>
          <p className="text-xs text-yellow-700 font-bold">Pendientes</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-green-600">{completed.length}</p>
          <p className="text-xs text-green-700 font-bold">Completadas</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex-1 text-center">
          <p className="text-2xl font-extrabold text-primary">{tasks.length}</p>
          <p className="text-xs text-primary font-bold">Total</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border">
          <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No tienes tareas asignadas aún.</p>
          <p className="text-sm mt-1">Tu terapeuta te asignará actividades de rehabilitación aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task: any) => {
            const s = STATUS_MAP[task.status] || STATUS_MAP.pending;
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";

            return (
              <div key={task.id} className={`bg-card rounded-2xl border p-5 shadow-sm ${task.status === "completed" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className={`font-extrabold text-base ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Asignada por: <strong>{task.assignedByName || "Tu terapeuta"}</strong>
                      {task.dueDate && (
                        <span className={isOverdue ? " text-destructive font-bold" : ""}>
                          {" · "}{isOverdue ? "⚠️ Vencida: " : "Fecha límite: "}
                          {new Date(task.dueDate).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${s.color}`}>
                    {s.icon} {s.label}
                  </span>
                </div>

                <p className="text-sm text-foreground/80 mb-3">{task.description}</p>

                {task.howTo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                    <p className="text-xs font-bold text-blue-700 mb-1">📖 Cómo realizarla:</p>
                    <p className="text-sm text-blue-800">{task.howTo}</p>
                  </div>
                )}

                {task.status !== "completed" && (
                  <div className="flex gap-2 mt-2">
                    {task.status === "pending" && (
                      <button
                        onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}
                        className="px-3 py-1.5 border rounded-lg text-xs font-bold hover:bg-muted"
                      >
                        Comenzar
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus.mutate({ id: task.id, status: "completed" })}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700"
                    >
                      ✅ Marcar como completada
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
