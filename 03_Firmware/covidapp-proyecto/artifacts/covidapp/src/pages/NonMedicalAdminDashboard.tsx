import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Users, BarChart2, Search, RefreshCw, LogOut, Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchStats() {
  const res = await fetch(`${BASE}/api/nonmedical-admin/stats`, { credentials: "include" });
  if (!res.ok) throw new Error("No autorizado");
  return res.json();
}

const ENTRY_METHODS = ["Todos", "Voluntario", "Remitido", "Urgencias", "Orden médica", "Otro"];

export default function NonMedicalAdminDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterEntry, setFilterEntry] = useState("Todos");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["nonmedical-stats"],
    queryFn: fetchStats,
  });

  const patients: any[] = data?.patients || [];

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.fullName || "").toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.insuranceCompany || "").toLowerCase().includes(q);
    const matchEntry = filterEntry === "Todos" || p.entryMethod === filterEntry;
    return matchSearch && matchEntry;
  });

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = import.meta.env.BASE_URL;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl">📊</div>
          <div>
            <h1 className="text-2xl font-extrabold">Administración General</h1>
            <p className="text-muted-foreground text-sm">{user?.fullName || user?.username}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-1 px-4 py-2 border border-destructive/30 text-destructive text-sm font-bold rounded-xl hover:bg-destructive/10">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-3xl font-extrabold">{data?.totalPatients ?? "—"}</p>
            <p className="text-muted-foreground text-sm">Total pacientes</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <BarChart2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-3xl font-extrabold">{data?.totalAppointments ?? "—"}</p>
            <p className="text-muted-foreground text-sm">Citas registradas</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-3xl font-extrabold">
              {patients.filter(p => p.insuranceCompany).length}
            </p>
            <p className="text-muted-foreground text-sm">Con seguro médico</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-bold">Pacientes Registrados</h2>
          <div className="flex gap-2 flex-wrap">
            <select value={filterEntry} onChange={e => setFilterEntry(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm">
              {ENTRY_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button onClick={() => refetch()} className="p-2 border rounded-xl hover:bg-muted">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{search ? "Sin resultados" : "No hay pacientes registrados"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["#", "Nombre", "Usuario", "Correo", "EPS/Seguro", "N° Afiliación", "Método de Ingreso", "Registro"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-bold text-muted-foreground text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`border-t hover:bg-muted/20 ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="px-4 py-3 text-muted-foreground">#{p.id}</td>
                    <td className="px-4 py-3 font-bold">{p.fullName || <span className="italic text-muted-foreground">Sin nombre</span>}</td>
                    <td className="px-4 py-3">{p.username}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3">
                      {p.insuranceCompany ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{p.insuranceCompany}</span>
                      ) : <span className="text-muted-foreground italic text-xs">No registrado</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.insuranceNumber || "—"}</td>
                    <td className="px-4 py-3">
                      {p.entryMethod ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{p.entryMethod}</span>
                      ) : <span className="text-muted-foreground italic text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(p.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
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
