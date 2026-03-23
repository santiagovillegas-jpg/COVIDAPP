import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { MapPin, Phone, Plus, ExternalLink, Clock, Building2, Pill, Trash2, Edit3 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}/api/resources${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });

const RESOURCE_TYPES = [
  { value: "medical_center", label: "Centro Médico", icon: "🏥" },
  { value: "pharmacy", label: "Farmacia", icon: "💊" },
  { value: "lab", label: "Laboratorio", icon: "🔬" },
  { value: "imaging", label: "Imágenes Diagnósticas", icon: "🩻" },
  { value: "other", label: "Otro", icon: "📍" },
];

function getIcon(type: string) {
  return RESOURCE_TYPES.find(t => t.value === type)?.icon || "📍";
}
function getLabel(type: string) {
  return RESOURCE_TYPES.find(t => t.value === type)?.label || type;
}

const EMPTY_FORM = { name: "", type: "medical_center", address: "", phone: "", mapsUrl: "", schedule: "", notes: "" };

export default function Resources() {
  const { isSuperAdmin, isTherapist, isNonMedicalAdmin } = useAuth();
  const isAdmin = isSuperAdmin || isTherapist || isNonMedicalAdmin;
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterType, setFilterType] = useState("all");

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: () => api("").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: () => api("", { method: "POST", body: JSON.stringify(form) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Recurso agregado" });
      qc.invalidateQueries({ queryKey: ["resources"] });
      setForm({ ...EMPTY_FORM }); setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => api(`/${editId}`, { method: "PUT", body: JSON.stringify(form) }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Recurso actualizado" });
      qc.invalidateQueries({ queryKey: ["resources"] });
      setEditId(null); setForm({ ...EMPTY_FORM }); setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api(`/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Recurso eliminado" });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
  });

  const startEdit = (r: any) => {
    setForm({ name: r.name, type: r.type, address: r.address || "", phone: r.phone || "", mapsUrl: r.mapsUrl || "", schedule: r.schedule || "", notes: r.notes || "" });
    setEditId(r.id); setShowForm(true);
  };

  const filtered = filterType === "all" ? resources : resources.filter((r: any) => r.type === filterType);
  const grouped = RESOURCE_TYPES.map(t => ({ ...t, items: filtered.filter((r: any) => r.type === t.value) })).filter(g => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Recursos y Centros Médicos</h1>
          <p className="text-muted-foreground text-sm">Centros médicos, farmacias y recursos disponibles para los pacientes.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(!showForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl">
            <Plus className="w-4 h-4" /> Agregar recurso
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && isAdmin && (
        <div className="bg-card rounded-2xl border shadow-sm p-6 mb-6 space-y-4">
          <h3 className="font-bold">{editId ? "Editar recurso" : "Nuevo recurso"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Nombre *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Tipo *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm">
                {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Dirección</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Teléfono</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Enlace Google Maps</label>
              <input value={form.mapsUrl} onChange={e => setForm(f => ({ ...f, mapsUrl: e.target.value }))}
                placeholder="https://maps.google.com/..."
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Horario de atención</label>
              <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                placeholder="Ej: Lun-Vie 8am-6pm"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Notas adicionales</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => editId ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50">
              {editId ? "Guardar cambios" : "Agregar recurso"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-5 py-2 border rounded-xl text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 text-sm font-bold rounded-lg ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          Todos
        </button>
        {RESOURCE_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilterType(t.value)}
            className={`px-3 py-1.5 text-sm font-bold rounded-lg ${filterType === t.value ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No hay recursos registrados aún.</p>
          {isAdmin && <p className="text-sm mt-1">Agrega centros médicos o farmacias para tus pacientes.</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.value}>
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="text-xl">{group.icon}</span> {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {group.items.map((r: any) => (
                  <div key={r.id} className="bg-card rounded-2xl border p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-extrabold text-base">{r.name}</h4>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(r)} className="p-1.5 hover:bg-muted rounded-lg">
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => { if (confirm("¿Eliminar este recurso?")) deleteMutation.mutate(r.id); }}
                            className="p-1.5 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      {r.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{r.address}</span>
                        </div>
                      )}
                      {r.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 flex-shrink-0" /> <span>{r.phone}</span>
                        </div>
                      )}
                      {r.schedule && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" /> <span>{r.schedule}</span>
                        </div>
                      )}
                      {r.notes && <p className="text-xs mt-2 bg-muted/30 rounded-lg px-3 py-2">{r.notes}</p>}
                    </div>
                    {r.mapsUrl && (
                      <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1.5 text-primary text-sm font-bold hover:underline">
                        <ExternalLink className="w-4 h-4" /> Ver en mapa
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
