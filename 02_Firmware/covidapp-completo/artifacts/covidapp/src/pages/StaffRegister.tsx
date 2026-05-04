import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Stethoscope, Briefcase, Trash2, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}/api${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });

const EMPTY = {
  username: "", password: "", email: "", fullName: "", role: "therapist",
  jobTitle: "", department: "", specialization: "", licenseNumber: "", phone: "",
};

const DEPARTMENTS = ["Terapia Física", "Terapia del Habla", "Terapia Ocupacional", "Terapia Cognitiva", "Administración", "Recepción", "Enfermería", "Otro"];

export default function StaffRegister() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const { data: staffList = [], refetch, isLoading } = useQuery({
    queryKey: ["staff-list"],
    queryFn: () => api("/admin/users").then(r => r.json()),
  });

  const registerMutation = useMutation({
    mutationFn: () => api("/auth/register-staff", { method: "POST", body: JSON.stringify(form) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Personal registrado", description: `Cuenta de ${form.role === "therapist" ? "terapeuta" : "administrativo"} creada para ${form.fullName}.` });
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => api(`/admin/users/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Usuario eliminado" });
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
  });

  const staff = (staffList as any[]).filter((u: any) => ["therapist", "nonmedical_admin"].includes(u.role));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Gestión de Personal</h1>
        <p className="text-muted-foreground text-sm">Registra terapeutas, secretarias y demás personal de la Fundación COVIDA.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de registro */}
        <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
          <h2 className="font-extrabold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Nuevo empleado
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => set("role", "therapist")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${form.role === "therapist" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
              <Stethoscope className="w-4 h-4" /> Terapeuta
            </button>
            <button onClick={() => set("role", "nonmedical_admin")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${form.role === "nonmedical_admin" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-border"}`}>
              <Briefcase className="w-4 h-4" /> Administrativo
            </button>
          </div>

          <div className="space-y-3">
            <FormField label="Nombre completo *" value={form.fullName} onChange={v => set("fullName", v)} />
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Usuario *" value={form.username} onChange={v => set("username", v)} />
              <FormField label="Contraseña *" value={form.password} onChange={v => set("password", v)} type="password" />
            </div>
            <FormField label="Correo electrónico *" value={form.email} onChange={v => set("email", v)} type="email" />
            <FormField label="Teléfono" value={form.phone} onChange={v => set("phone", v)} type="tel" />
            <FormField label="Cargo / Título" value={form.jobTitle} onChange={v => set("jobTitle", v)}
              placeholder={form.role === "therapist" ? "Ej: Terapeuta Físico" : "Ej: Secretaria, Auxiliar Admin."} />
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Área / Departamento</label>
              <select value={form.department} onChange={e => set("department", e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {form.role === "therapist" && (
              <>
                <FormField label="Especialización" value={form.specialization} onChange={v => set("specialization", v)}
                  placeholder="Ej: Fisioterapia Neurológica" />
                <FormField label="N° Tarjeta Profesional" value={form.licenseNumber} onChange={v => set("licenseNumber", v)} />
              </>
            )}
          </div>

          <button
            onClick={() => registerMutation.mutate()}
            disabled={!form.username || !form.password || !form.email || !form.fullName || registerMutation.isPending}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50 hover:bg-primary/90"
          >
            {registerMutation.isPending ? "Registrando..." : "✅ Registrar empleado"}
          </button>
        </div>

        {/* Lista del personal actual */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-extrabold">Personal actual ({staff.length})</h2>
            <button onClick={() => refetch()} className="p-1.5 hover:bg-muted rounded-lg">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : staff.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No hay personal registrado.</p>
            ) : staff.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-4 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {(u.fullName || u.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{u.fullName || u.username}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold mt-0.5 inline-block ${u.role === "therapist" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                      {u.role === "therapist" ? "Terapeuta" : "Administrativo"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm(`¿Eliminar la cuenta de ${u.fullName || u.username}?`)) deleteUserMutation.mutate(u.id); }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
    </div>
  );
}
