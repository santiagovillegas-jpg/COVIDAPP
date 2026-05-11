import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import {
  Users, FileText, Plus, ChevronRight, ClipboardList, Activity,
  LogOut, X, Pill, CheckSquare, Calendar
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}/api${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });

const THERAPY_TYPES = ["Terapia Física", "Terapia del Habla", "Terapia Ocupacional", "Terapia Cognitiva"];
const NOTE_TYPES = [
  { value: "session", label: "Sesión" },
  { value: "evaluation", label: "Evaluación" },
  { value: "progress", label: "Progreso" },
  { value: "incident", label: "Incidente" },
  { value: "discharge", label: "Alta" },
];
const ROUTES = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Tópica" },
  { value: "injectable", label: "Inyectable" },
  { value: "inhaled", label: "Inhalada" },
];

type TabView = "patients" | "notes" | "enroll" | "traceability" | "assign" | "tasks" | "meds";

export default function TherapistDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [view, setView] = useState<TabView>("patients");

  const [noteForm, setNoteForm] = useState({ therapyType: THERAPY_TYPES[0], noteType: "session", content: "" });
  const [enrollForm, setEnrollForm] = useState({ therapyType: THERAPY_TYPES[0], appointmentDate: "", notes: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", howTo: "", dueDate: "" });
  const [medForm, setMedForm] = useState({
    medicineName: "", dosage: "", frequency: "", routeOfAdmin: "oral",
    startDate: "", endDate: "", instructions: "",
  });

  // Queries
  const { data: patients = [] } = useQuery({
    queryKey: ["therapist-patients"],
    queryFn: () => api("/therapist/patients").then(r => r.json()),
  });
  const { data: availablePatients = [] } = useQuery({
    queryKey: ["available-patients"],
    queryFn: () => api("/therapist/available-patients").then(r => r.json()),
    enabled: view === "assign",
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["patient-notes", selectedPatient?.id],
    queryFn: () => api(`/therapist/patients/${selectedPatient?.id}/notes`).then(r => r.json()),
    enabled: !!selectedPatient && view === "notes",
  });
  const { data: traceability = [] } = useQuery({
    queryKey: ["patient-traceability", selectedPatient?.id],
    queryFn: () => api(`/therapist/patients/${selectedPatient?.id}/traceability`).then(r => r.json()),
    enabled: !!selectedPatient && view === "traceability",
  });
  const { data: patientTasks = [] } = useQuery({
    queryKey: ["patient-tasks", selectedPatient?.id],
    queryFn: () => api(`/tasks/patient/${selectedPatient?.id}`).then(r => r.json()),
    enabled: !!selectedPatient && view === "tasks",
  });
  const { data: patientMeds = [] } = useQuery({
    queryKey: ["patient-meds", selectedPatient?.id],
    queryFn: () => api(`/medications/patient/${selectedPatient?.id}`).then(r => r.json()),
    enabled: !!selectedPatient && view === "meds",
  });

  // Mutations
  const assignMutation = useMutation({
    mutationFn: (patientId: number) => api("/therapist/patients/assign", { method: "POST", body: JSON.stringify({ patientId }) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Paciente asignado" });
      qc.invalidateQueries({ queryKey: ["therapist-patients"] });
      qc.invalidateQueries({ queryKey: ["available-patients"] });
      setView("patients");
    },
  });
  const noteMutation = useMutation({
    mutationFn: () => api(`/therapist/patients/${selectedPatient?.id}/notes`, { method: "POST", body: JSON.stringify(noteForm) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Nota guardada" });
      setNoteForm({ therapyType: THERAPY_TYPES[0], noteType: "session", content: "" });
      qc.invalidateQueries({ queryKey: ["patient-notes", selectedPatient?.id] });
    },
  });
  const enrollMutation = useMutation({
    mutationFn: () => api(`/therapist/patients/${selectedPatient?.id}/enroll-therapy`, { method: "POST", body: JSON.stringify(enrollForm) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Terapia inscrita y notificación enviada" });
      setEnrollForm({ therapyType: THERAPY_TYPES[0], appointmentDate: "", notes: "" });
      setView("patients");
    },
  });
  const removeMutation = useMutation({
    mutationFn: (id: number) => api(`/therapist/patients/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Asignación removida" });
      qc.invalidateQueries({ queryKey: ["therapist-patients"] });
      setSelectedPatient(null); setView("patients");
    },
  });
  const taskMutation = useMutation({
    mutationFn: () => api("/tasks", { method: "POST", body: JSON.stringify({ ...taskForm, patientId: selectedPatient?.id }) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Tarea asignada y notificación enviada al paciente" });
      setTaskForm({ title: "", description: "", howTo: "", dueDate: "" });
      qc.invalidateQueries({ queryKey: ["patient-tasks", selectedPatient?.id] });
    },
  });
  const medMutation = useMutation({
    mutationFn: () => api("/medications", { method: "POST", body: JSON.stringify({ ...medForm, patientId: selectedPatient?.id }) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Medicamento prescrito y notificación enviada" });
      setMedForm({ medicineName: "", dosage: "", frequency: "", routeOfAdmin: "oral", startDate: "", endDate: "", instructions: "" });
      qc.invalidateQueries({ queryKey: ["patient-meds", selectedPatient?.id] });
    },
  });
  const deactivateMedMutation = useMutation({
    mutationFn: (id: number) => api(`/medications/${id}`, { method: "PUT", body: JSON.stringify({ isActive: false }) }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Medicamento desactivado" });
      qc.invalidateQueries({ queryKey: ["patient-meds", selectedPatient?.id] });
    },
  });

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = import.meta.env.BASE_URL;
  };

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "notes", label: "Notas", icon: <FileText className="w-3.5 h-3.5" /> },
    { key: "enroll", label: "Inscribir", icon: <Plus className="w-3.5 h-3.5" /> },
    { key: "tasks", label: "Tareas", icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { key: "meds", label: "Medicamentos", icon: <Pill className="w-3.5 h-3.5" /> },
    { key: "traceability", label: "Trazabilidad", icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">🩺</div>
          <div>
            <h1 className="text-2xl font-extrabold">Panel Terapeuta</h1>
            <p className="text-muted-foreground text-sm">{user?.fullName || user?.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setSelectedPatient(null); setView("assign"); }}
            className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl">
            <Plus className="w-4 h-4" /> Asignar Paciente
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1 px-4 py-2 border border-destructive/30 text-destructive text-sm font-bold rounded-xl hover:bg-destructive/10">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Mis Pacientes ({patients.length})</h2>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {patients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Sin pacientes asignados.</p>
            ) : patients.map((p: any) => (
              <div key={p.id} onClick={() => { setSelectedPatient(p); setView("notes"); }}
                className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition-colors ${selectedPatient?.id === p.id ? "bg-primary/5 border-l-4 border-primary" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                  {(p.fullName || p.username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{p.fullName || p.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

        {/* Contenido derecho */}
        <div className="lg:col-span-2 space-y-4">

          {/* Asignar paciente */}
          {view === "assign" && (
            <div className="bg-card rounded-2xl border shadow-sm p-6">
              <h2 className="font-bold text-lg mb-4">Asignar nuevo paciente</h2>
              {availablePatients.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay pacientes disponibles para asignar.</p>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden">
                  {availablePatients.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                      <div>
                        <p className="font-bold text-sm">{p.fullName || p.username}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                      <button onClick={() => assignMutation.mutate(p.id)} disabled={assignMutation.isPending}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg">
                        Asignar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paciente seleccionado */}
          {selectedPatient && view !== "assign" && (
            <>
              {/* Info paciente */}
              <div className="bg-card rounded-2xl border shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-xl font-extrabold">{selectedPatient.fullName || selectedPatient.username}</h2>
                    <p className="text-muted-foreground text-sm">{selectedPatient.email}</p>
                    <div className="flex gap-3 mt-1 text-sm flex-wrap">
                      {selectedPatient.insuranceCompany && <span>🏥 <strong>{selectedPatient.insuranceCompany}</strong> · {selectedPatient.insuranceNumber}</span>}
                      {selectedPatient.entryMethod && <span>📋 <strong>{selectedPatient.entryMethod}</strong></span>}
                    </div>
                  </div>
                  <button onClick={() => { if (confirm("¿Remover asignación?")) removeMutation.mutate(selectedPatient.id); }}
                    className="text-xs text-destructive border border-destructive/30 px-2 py-1 rounded-lg hover:bg-destructive/10">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setView(tab.key)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${view === tab.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTAS */}
              {view === "notes" && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                  <h3 className="font-bold">Agregar nota clínica</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={noteForm.therapyType} onChange={e => setNoteForm(f => ({ ...f, therapyType: e.target.value }))}
                      className="border rounded-xl px-3 py-2 text-sm">
                      {THERAPY_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select value={noteForm.noteType} onChange={e => setNoteForm(f => ({ ...f, noteType: e.target.value }))}
                      className="border rounded-xl px-3 py-2 text-sm">
                      {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <textarea value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
                    placeholder="Nota clínica..." rows={3}
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={() => noteMutation.mutate()} disabled={!noteForm.content || noteMutation.isPending}
                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl disabled:opacity-50">
                    {noteMutation.isPending ? "Guardando..." : "Guardar nota"}
                  </button>
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-bold text-sm">Historial ({notes.length})</h4>
                    {notes.length === 0 ? <p className="text-sm text-muted-foreground">Sin notas.</p>
                      : notes.map((n: any) => (
                        <div key={n.id} className="bg-muted/30 rounded-xl p-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-primary">{n.therapyType} · {NOTE_TYPES.find(t => t.value === n.noteType)?.label || n.noteType}</span>
                            <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString("es-CO")}</span>
                          </div>
                          <p className="text-sm">{n.content}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* INSCRIBIR TERAPIA */}
              {view === "enroll" && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                  <h3 className="font-bold">Inscribir nueva terapia</h3>
                  <select value={enrollForm.therapyType} onChange={e => setEnrollForm(f => ({ ...f, therapyType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm">
                    {THERAPY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Fecha y hora de cita</label>
                    <input type="datetime-local" value={enrollForm.appointmentDate}
                      onChange={e => setEnrollForm(f => ({ ...f, appointmentDate: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <textarea value={enrollForm.notes} onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Observaciones (opcional)" rows={2}
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={() => enrollMutation.mutate()} disabled={!enrollForm.appointmentDate || enrollMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50">
                    {enrollMutation.isPending ? "Inscribiendo..." : "✅ Inscribir y notificar"}
                  </button>
                </div>
              )}

              {/* TAREAS */}
              {view === "tasks" && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                  <h3 className="font-bold">Asignar tarea de rehabilitación</h3>
                  <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Título de la tarea *"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descripción de la tarea *" rows={2}
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                  <textarea value={taskForm.howTo} onChange={e => setTaskForm(f => ({ ...f, howTo: e.target.value }))}
                    placeholder="¿Cómo realizarla? (instrucciones detalladas)" rows={3}
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Fecha límite (opcional)</label>
                    <input type="datetime-local" value={taskForm.dueDate}
                      onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <button onClick={() => taskMutation.mutate()} disabled={!taskForm.title || !taskForm.description || taskMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                    {taskMutation.isPending ? "Asignando..." : "📋 Asignar tarea"}
                  </button>
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-bold text-sm">Tareas asignadas ({patientTasks.length})</h4>
                    {patientTasks.length === 0 ? <p className="text-sm text-muted-foreground">Sin tareas.</p>
                      : patientTasks.map((t: any) => (
                        <div key={t.id} className="bg-muted/30 rounded-xl p-3">
                          <div className="flex justify-between">
                            <span className="font-bold text-sm">{t.title}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${t.status === "completed" ? "bg-green-100 text-green-700" : t.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {t.status === "completed" ? "Completada" : t.status === "in_progress" ? "En progreso" : "Pendiente"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* MEDICAMENTOS */}
              {view === "meds" && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                  <h3 className="font-bold">Prescribir medicamento</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={medForm.medicineName} onChange={e => setMedForm(f => ({ ...f, medicineName: e.target.value }))}
                      placeholder="Nombre del medicamento *"
                      className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))}
                      placeholder="Dosis (ej: 500mg) *"
                      className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input value={medForm.frequency} onChange={e => setMedForm(f => ({ ...f, frequency: e.target.value }))}
                      placeholder="Frecuencia (ej: Cada 8 horas) *"
                      className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    <select value={medForm.routeOfAdmin} onChange={e => setMedForm(f => ({ ...f, routeOfAdmin: e.target.value }))}
                      className="border rounded-xl px-3 py-2 text-sm">
                      {ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Fecha inicio *</label>
                      <input type="date" value={medForm.startDate} onChange={e => setMedForm(f => ({ ...f, startDate: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Fecha fin (opcional)</label>
                      <input type="date" value={medForm.endDate} onChange={e => setMedForm(f => ({ ...f, endDate: e.target.value }))}
                        className="w-full border rounded-xl px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <textarea value={medForm.instructions} onChange={e => setMedForm(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="Instrucciones especiales" rows={2}
                    className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={() => medMutation.mutate()}
                    disabled={!medForm.medicineName || !medForm.dosage || !medForm.frequency || !medForm.startDate || medMutation.isPending}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50">
                    {medMutation.isPending ? "Prescribiendo..." : "💊 Prescribir medicamento"}
                  </button>
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-bold text-sm">Medicamentos activos ({patientMeds.filter((m: any) => m.isActive).length})</h4>
                    {patientMeds.length === 0 ? <p className="text-sm text-muted-foreground">Sin recetas.</p>
                      : patientMeds.map((m: any) => (
                        <div key={m.id} className="bg-muted/30 rounded-xl p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-sm">💊 {m.medicineName}</span>
                              <p className="text-xs text-muted-foreground">{m.dosage} · {m.frequency}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${m.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                {m.isActive ? "Activa" : "Inactiva"}
                              </span>
                              {m.isActive && (
                                <button onClick={() => deactivateMedMutation.mutate(m.id)}
                                  className="text-xs text-destructive hover:underline">
                                  Desactivar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TRAZABILIDAD */}
              {view === "traceability" && (
                <div className="bg-card rounded-2xl border shadow-sm p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5" /> Trazabilidad Médica</h3>
                  {traceability.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin registros.</p>
                  ) : (
                    <div className="space-y-3">
                      {traceability.map((t: any, i: number) => (
                        <div key={t.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                            {i < traceability.length - 1 && <div className="w-0.5 bg-border flex-1 mt-1" />}
                          </div>
                          <div className="bg-muted/30 rounded-xl p-3 flex-1 mb-2">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-bold text-primary">{t.therapyType} · {NOTE_TYPES.find(x => x.value === t.noteType)?.label || t.noteType}</span>
                              <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <p className="text-sm mt-1">{t.content}</p>
                            {t.therapistName && <p className="text-xs text-muted-foreground mt-1">— {t.therapistName}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedPatient && view !== "assign" && (
            <div className="bg-card rounded-2xl border flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Selecciona un paciente para comenzar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
