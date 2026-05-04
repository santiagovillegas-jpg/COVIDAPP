import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { Trash2, Users, ShieldCheck, Search, RefreshCw, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Patient {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchUsers(): Promise<Patient[]> {
  const res = await fetch(`${BASE}/api/admin/users`, { credentials: "include" });
  if (!res.ok) throw new Error("No autorizado");
  return res.json();
}

async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al eliminar");
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast({ title: "Usuario eliminado", description: "El paciente fue eliminado del sistema." });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
    },
  });

  const handleDelete = (p: Patient) => {
    if (!confirm(`¿Eliminar al paciente "${p.username}"? Esta acción no se puede deshacer.`)) return;
    deleteMutation.mutate(p.id);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = import.meta.env.BASE_URL;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Panel de Administración</h1>
            <p className="text-muted-foreground text-sm">Bienvenido, <strong>{user?.username}</strong></p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-2xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-extrabold">{users.length}</p>
            <p className="text-muted-foreground text-sm">Pacientes registrados</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold">{filtered.length}</p>
            <p className="text-muted-foreground text-sm">Resultados de búsqueda</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-extrabold">1</p>
            <p className="text-muted-foreground text-sm">Administrador activo</p>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-bold text-lg">Usuarios Registrados</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border hover:bg-muted transition-colors"
              title="Actualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "No se encontraron pacientes" : "No hay pacientes registrados aún"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-5 py-3 font-bold text-muted-foreground">ID</th>
                  <th className="text-left px-5 py-3 font-bold text-muted-foreground">Usuario</th>
                  <th className="text-left px-5 py-3 font-bold text-muted-foreground">Nombre</th>
                  <th className="text-left px-5 py-3 font-bold text-muted-foreground">Correo</th>
                  <th className="text-left px-5 py-3 font-bold text-muted-foreground">Registro</th>
                  <th className="text-left px-5 py-3 font-bold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`border-t hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-5 py-4 text-muted-foreground">#{p.id}</td>
                    <td className="px-5 py-4 font-bold">{p.username}</td>
                    <td className="px-5 py-4">{p.fullName || <span className="text-muted-foreground italic">Sin nombre</span>}</td>
                    <td className="px-5 py-4 text-muted-foreground">{p.email}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
