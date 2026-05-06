import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import {
  Users, FileText, Plus, ChevronRight, ClipboardList, Activity,
  LogOut, X, Pill, CheckSquare, Calendar, ClipboardEdit, AlertCircle,
  FolderOpen, Upload, Trash2, Download, Image, Video, CalendarDays, Clock, Stethoscope
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

type TabView = "patients" | "notes" | "enroll" | "traceability" | "assign" | "tasks" | "meds" | "historial" | "archivos" | "citas" | "horario" | "materiales";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const BLOOD_TYPES = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ENTRY_METHODS = ["Voluntario", "Remitido", "Urgencias", "Orden médica", "Otro"];
const DOC_TYPES = ["Cédula de ciudadanía", "Cédula de extranjería", "Tarjeta de identidad", "Pasaporte", "Otro"];

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
  const [errorModal, setErrorModal] = useState(false);
  const [errorForm, setErrorForm] = useState({ section: "Panel Terapeuta", description: "" });
  const [medicalForm, setMedicalForm] = useState<Record<string, string>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [storageFile, setStorageFile] = useState<File | null>(null);
  const [storageDesc, setStorageDesc] = useState("");
  const [isStorageUploading, setIsStorageUploading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ dayOfWeek: 1, startTime: "08:00", endTime: "17:00", slotDuration: 30 });
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matForm, setMatForm] = useState({ title: "", description: "", therapyType: THERAPY_TYPES[0] });
  const [isMatUploading, setIsMatUploading] = useState(false);

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
  const { data: patientFiles = [], isLoading: isFilesLoading } = useQuery<any[]>({
    queryKey: ["patient-files", selectedPatient?.id],
    queryFn: () => fetch(`${BASE}/api/files/patients/${selectedPatient?.id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedPatient && view === "archivos",
  });
  const { data: myStorage = [], isLoading: isStorageLoading, refetch: refetchStorage } = useQuery<any[]>({
    queryKey: ["my-storage"],
    queryFn: () => fetch(`${BASE}/api/files/storage`, { credentials: "include" }).then(r => r.json()),
    enabled: view === "archivos",
  });
  const { data: myAppointments = [], isLoading: isApptLoading } = useQuery<any[]>({
    queryKey: ["doctor-appointments", user?.id],
    queryFn: () => fetch(`${BASE}/api/doctors/${user?.id}/appointments`, { credentials: "include" }).then(r => r.json()),
    enabled: view === "citas" && !!user,
  });
  const { data: mySchedules = [], isLoading: isScheduleLoading } = useQuery<any[]>({
    queryKey: ["doctor-schedules-my"],
    queryFn: () => fetch(`${BASE}/api/doctors/schedules/my`, { credentials: "include" }).then(r => r.json()),
    enabled: view === "horario",
  });
  const { data: workMaterials = [], isLoading: isMatLoading } = useQuery<any[]>({
    queryKey: ["work-materials"],
    queryFn: () => fetch(`${BASE}/api/materials`, { credentials: "include" }).then(r => r.json()),
    enabled: view === "materiales",
  });

  const { data: patientMedical, isLoading: isMedicalLoading } = useQuery({
    queryKey: ["patient-medical", selectedPatient?.id],
    queryFn: () => api(`/therapist/patients/${selectedPatient?.id}/medical`).then(r => r.json()),
    enabled: !!selectedPatient && view === "historial",
    onSuccess: (d: any) => {
      setMedicalForm({
        fullName: d.fullName || "",
        phone: d.phone || "",
        address: d.address || "",
        birthdate: d.birthdate || "",
        documentType: d.documentType || "",
        documentNumber: d.documentNumber || "",
        bloodType: d.bloodType || "",
        allergies: d.allergies || "",
        emergencyContact: d.emergencyContact || "",
        emergencyPhone: d.emergencyPhone || "",
        insuranceCompany: d.insuranceCompany || "",
        insuranceNumber: d.insuranceNumber || "",
        entryMethod: d.entryMethod || "",
      });
    },
  } as any);

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
  const medicalMutation = useMutation({
    mutationFn: () => api(`/therapist/patients/${selectedPatient?.id}/medical`, { method: "PUT", body: JSON.stringify(medicalForm) }).then(r => r.json()),
    onSuccess: (d: any) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Historial actualizado", description: "Los datos del paciente fueron guardados y se notificó por correo." });
      qc.invalidateQueries({ queryKey: ["patient-medical", selectedPatient?.id] });
    },
  });
  const errorReportMutation = useMutation({
    mutationFn: () => api("/therapist/report-error", { method: "POST", body: JSON.stringify(errorForm) }).then(r => r.json()),
    onSuccess: (d: any) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Reporte enviado", description: "El reporte fue enviado al administrador." });
      setErrorForm({ section: "Panel Terapeuta", description: "" });
      setErrorModal(false);
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => fetch(`${BASE}/api/files/${fileId}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Archivo eliminado" });
      qc.invalidateQueries({ queryKey: ["patient-files", selectedPatient?.id] });
    },
  });
  const deleteStorageMutation = useMutation({
    mutationFn: (fileId: number) => fetch(`${BASE}/api/files/storage/${fileId}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Archivo eliminado del almacenamiento" });
      qc.invalidateQueries({ queryKey: ["my-storage"] });
    },
  });
  const sendToPatientMutation = useMutation({
    mutationFn: (storageFileId: number) =>
      fetch(`${BASE}/api/files/storage/${storageFileId}/send-to/${selectedPatient?.id}`, { method: "POST", credentials: "include" }).then(r => r.json()),
    onSuccess: (d: any) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Archivo enviado", description: `El archivo fue enviado a ${selectedPatient?.fullName || "el paciente"}.` });
      qc.invalidateQueries({ queryKey: ["patient-files", selectedPatient?.id] });
    },
  });

  const handleUpload = async () => {
    if (!uploadFile || !selectedPatient) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      if (uploadDesc) fd.append("description", uploadDesc);
      const res = await fetch(`${BASE}/api/files/patients/${selectedPatient.id}`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error || "No se pudo subir el archivo", variant: "destructive" }); return; }
      toast({ title: "Archivo enviado al paciente", description: uploadFile.name });
      setUploadFile(null);
      setUploadDesc("");
      qc.invalidateQueries({ queryKey: ["patient-files", selectedPatient.id] });
    } catch {
      toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const saveScheduleMutation = useMutation({
    mutationFn: (data: any) => fetch(`${BASE}/api/doctors/schedules`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Horario guardado" });
      qc.invalidateQueries({ queryKey: ["doctor-schedules-my"] });
    },
  });
  const deleteScheduleMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/api/doctors/schedules/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Horario eliminado" });
      qc.invalidateQueries({ queryKey: ["doctor-schedules-my"] });
    },
  });
  const updateApptStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`${BASE}/api/appointments/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Estado actualizado" });
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    },
  });

  const handleStorageUpload = async () => {
    if (!storageFile) return;
    setIsStorageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", storageFile);
      if (storageDesc) fd.append("description", storageDesc);
      const res = await fetch(`${BASE}/api/files/storage`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error || "No se pudo subir el archivo", variant: "destructive" }); return; }
      toast({ title: "Archivo guardado en almacenamiento" });
      setStorageFile(null);
      setStorageDesc("");
      qc.invalidateQueries({ queryKey: ["my-storage"] });
    } catch {
      toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setIsStorageUploading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = import.meta.env.BASE_URL;
  };

  const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
    { key: "historial", label: "Historial", icon: <ClipboardEdit className="w-3.5 h-3.5" /> },
    { key: "archivos", label: "Archivos", icon: <FolderOpen className="w-3.5 h-3.5" /> },
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
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setSelectedPatient(null); setView("citas"); }}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-bold rounded-xl border transition-colors ${view === "citas" ? "bg-primary text-primary-foreground border-primary" : "border-primary/30 text-primary hover:bg-primary/5"}`}>
            <CalendarDays className="w-4 h-4" /> Mis Citas
          </button>
          <button onClick={() => { setSelectedPatient(null); setView("horario"); }}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-bold rounded-xl border transition-colors ${view === "horario" ? "bg-indigo-600 text-white border-indigo-600" : "border-indigo-300 text-indigo-600 hover:bg-indigo-50"}`}>
            <Clock className="w-4 h-4" /> Mi Horario
          </button>
          <button onClick={() => { setSelectedPatient(null); setView("materiales"); }}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-bold rounded-xl border transition-colors ${view === "materiales" ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"}`}>
            <Upload className="w-4 h-4" /> Material
          </button>
          <button onClick={() => { setSelectedPatient(null); setView("assign"); }}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl">
            <Plus className="w-4 h-4" /> Asignar
          </button>
          <button onClick={() => setErrorModal(true)}
            className="flex items-center gap-1 px-3 py-2 border border-amber-400 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-50">
            <AlertCircle className="w-4 h-4" /> Error
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-2 border border-destructive/30 text-destructive text-sm font-bold rounded-xl hover:bg-destructive/10">
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

          {/* MIS CITAS */}
          {view === "citas" && (
            <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> Mis Citas
                </h2>
                <span className="text-xs text-muted-foreground">{user?.specialization ? `Especialidad: ${(user as any).specialization}` : ""}</span>
              </div>
              {isApptLoading ? (
                <div className="flex justify-center py-8"><div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : myAppointments.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-xl">
                  <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No tienes citas agendadas.</p>
                  <p className="text-xs text-muted-foreground mt-1">Los pacientes pueden agendar contigo desde su portal.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myAppointments.map((appt: any) => {
                    const d = new Date(appt.appointmentDate);
                    const isPast = d < new Date();
                    return (
                      <div key={appt.id} className={`flex items-center gap-4 p-4 rounded-xl border ${appt.status === "cancelled" ? "opacity-50 bg-muted/20" : isPast ? "bg-muted/10" : "bg-card hover:shadow-md"} transition-all`}>
                        <div className="text-center flex-shrink-0 w-14">
                          <p className="text-2xl font-black text-primary">{d.getDate()}</p>
                          <p className="text-xs text-muted-foreground font-medium">{d.toLocaleDateString("es-CO", { month: "short" }).toUpperCase()}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">{appt.therapyType}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${appt.status === "pending" ? "bg-amber-100 text-amber-700" : appt.status === "confirmed" ? "bg-green-100 text-green-700" : appt.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                              {appt.status === "pending" ? "Pendiente" : appt.status === "confirmed" ? "Confirmada" : appt.status === "completed" ? "Completada" : "Cancelada"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Paciente: <strong>{appt.patientName || "—"}</strong></p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
                          {appt.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{appt.notes}"</p>}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {appt.status === "pending" && (
                            <>
                              <button onClick={() => updateApptStatusMutation.mutate({ id: appt.id, status: "confirmed" })}
                                className="px-2 py-1 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700">Confirmar</button>
                              <button onClick={() => updateApptStatusMutation.mutate({ id: appt.id, status: "cancelled" })}
                                className="px-2 py-1 text-xs font-bold border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/10">Cancelar</button>
                            </>
                          )}
                          {appt.status === "confirmed" && (
                            <button onClick={() => updateApptStatusMutation.mutate({ id: appt.id, status: "completed" })}
                              className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Completar</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MI HORARIO */}
          {view === "horario" && (
            <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> Mi Horario de Atención
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">Configura los días y horas en que atiendes pacientes. Los pacientes verán estos horarios al agendar citas contigo.</p>

              {/* Add schedule form */}
              <div className="border rounded-xl p-4 bg-indigo-50/30 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Agregar / actualizar horario</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs font-medium">Día</label>
                    <select value={scheduleForm.dayOfWeek} onChange={e => setScheduleForm(f => ({ ...f, dayOfWeek: Number(e.target.value) }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Inicio</label>
                    <input type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Fin</label>
                    <input type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm(f => ({ ...f, endTime: e.target.value }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Duración (min)</label>
                    <select value={scheduleForm.slotDuration} onChange={e => setScheduleForm(f => ({ ...f, slotDuration: Number(e.target.value) }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => saveScheduleMutation.mutate({ dayOfWeek: scheduleForm.dayOfWeek, startTime: scheduleForm.startTime, endTime: scheduleForm.endTime, slotDurationMinutes: scheduleForm.slotDuration })}
                  disabled={saveScheduleMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  {saveScheduleMutation.isPending ? "Guardando..." : "Guardar Horario"}
                </button>
              </div>

              {/* Current schedules */}
              {isScheduleLoading ? (
                <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : mySchedules.length === 0 ? (
                <div className="text-center py-6 bg-muted/20 rounded-xl">
                  <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No tienes horarios configurados.</p>
                  <p className="text-xs text-muted-foreground mt-1">Agrega tus días y horas de atención arriba.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Horarios actuales</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mySchedules.sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-xl bg-card">
                        <div>
                          <p className="font-bold text-sm">{DAY_NAMES[s.dayOfWeek]}</p>
                          <p className="text-xs text-muted-foreground">{s.startTime} — {s.endTime} · Citas de {s.slotDurationMinutes} min</p>
                        </div>
                        <button onClick={() => { if (confirm(`¿Eliminar horario del ${DAY_NAMES[s.dayOfWeek]}?`)) deleteScheduleMutation.mutate(s.id); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paciente seleccionado */}
          {selectedPatient && !["assign", "citas", "horario"].includes(view) && (
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

              {/* ARCHIVOS */}
              {view === "archivos" && (
                <div className="space-y-4">
                  {/* ── PERSONAL STORAGE ── */}
                  <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <FolderOpen className="w-5 h-5 text-indigo-500" /> Mi Almacenamiento Personal
                    </h3>
                    <p className="text-xs text-muted-foreground">Sube archivos a tu espacio privado. Solo tú y los administradores pueden verlos. Desde aquí puedes enviarlos al paciente seleccionado.</p>

                    {/* Storage upload */}
                    <div className="border rounded-xl p-3 space-y-2 bg-muted/20">
                      <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${storageFile ? "border-indigo-400 bg-indigo-50" : "border-muted-foreground/30 hover:border-indigo-400/60"}`}>
                        <input type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={e => setStorageFile(e.target.files?.[0] || null)} />
                        {storageFile ? (
                          <div className="text-center px-4">
                            <p className="font-bold text-sm text-indigo-600 truncate max-w-xs">{storageFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(storageFile.size / 1024 / 1024).toFixed(2)} MB · click para cambiar</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-0.5" />
                            <p className="text-xs text-muted-foreground">Seleccionar archivo (máx. 200 MB)</p>
                          </div>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input value={storageDesc} onChange={e => setStorageDesc(e.target.value)} placeholder="Descripción (opcional)" className="flex-1 border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        <button onClick={handleStorageUpload} disabled={!storageFile || isStorageUploading} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5" /> {isStorageUploading ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>

                    {/* Storage file list */}
                    {isStorageLoading ? (
                      <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : myStorage.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Tu almacenamiento está vacío.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Mis archivos ({myStorage.length})</p>
                        {myStorage.map((f: any) => (
                          <div key={f.id} className="flex items-center gap-2 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                            {f.fileType === "image" ? <Image className="w-4 h-4 text-blue-500 flex-shrink-0" /> : f.fileType === "video" ? <Video className="w-4 h-4 text-purple-500 flex-shrink-0" /> : <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{f.originalName}</p>
                              <p className="text-xs text-muted-foreground">{(f.fileSize / 1024 / 1024).toFixed(2)} MB{f.description ? ` · ${f.description}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {selectedPatient && (
                                <button onClick={() => { if (confirm(`¿Enviar "${f.originalName}" a ${selectedPatient.fullName}?`)) sendToPatientMutation.mutate(f.id); }}
                                  className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                  disabled={sendToPatientMutation.isPending}>
                                  Enviar
                                </button>
                              )}
                              <a href={`${BASE}/api/files/storage/${f.id}/download`} download={f.originalName} className="p-1 rounded-lg hover:bg-muted transition-colors" title="Descargar">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button onClick={() => { if (confirm(`¿Eliminar "${f.originalName}" de tu almacenamiento?`)) deleteStorageMutation.mutate(f.id); }} className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Eliminar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── SEND DIRECTLY TO PATIENT ── */}
                  {selectedPatient && (
                    <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" /> Enviar archivo directo a {selectedPatient.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground">Este archivo solo será visible para este paciente, para ti y para los administradores.</p>
                      <div className="space-y-2">
                        <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadFile ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}`}>
                          <input type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                          {uploadFile ? (
                            <div className="text-center px-4">
                              <p className="font-bold text-sm text-primary truncate max-w-xs">{uploadFile.name}</p>
                              <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB · click para cambiar</p>
                            </div>
                          ) : (
                            <div className="text-center"><Upload className="w-5 h-5 mx-auto text-muted-foreground mb-0.5" /><p className="text-xs text-muted-foreground">Seleccionar archivo para el paciente</p></div>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <input value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} placeholder="Descripción (opcional)" className="flex-1 border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                          <button onClick={handleUpload} disabled={!uploadFile || isUploading} className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                            <Upload className="w-3.5 h-3.5" /> {isUploading ? "Enviando..." : "Enviar"}
                          </button>
                        </div>
                      </div>

                      {/* Sent files list */}
                      {isFilesLoading ? (
                        <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
                      ) : patientFiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Sin archivos enviados a este paciente.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Enviados a este paciente ({patientFiles.length})</p>
                          {patientFiles.map((f: any) => (
                            <div key={f.id} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl">
                              {f.fileType === "image" ? <Image className="w-4 h-4 text-blue-500 flex-shrink-0" /> : f.fileType === "video" ? <Video className="w-4 h-4 text-purple-500 flex-shrink-0" /> : <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{f.originalName}</p>
                                <p className="text-xs text-muted-foreground">{(f.fileSize / 1024 / 1024).toFixed(2)} MB · {new Date(f.uploadedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</p>
                                {f.description && <p className="text-xs text-muted-foreground italic">{f.description}</p>}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <a href={`${BASE}/api/files/${f.id}/download`} download={f.originalName} className="p-1 rounded-lg hover:bg-muted transition-colors" title="Descargar"><Download className="w-3.5 h-3.5" /></a>
                                <button onClick={() => { if (confirm(`¿Eliminar "${f.originalName}"?`)) deleteFileMutation.mutate(f.id); }} className="p-1 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* HISTORIAL MÉDICO */}
              {view === "historial" && (
                <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <ClipboardEdit className="w-5 h-5 text-primary" /> Historial Médico del Paciente
                  </h3>
                  <p className="text-xs text-muted-foreground">Los cambios guardados se notificarán automáticamente al paciente por correo electrónico.</p>

                  {isMedicalLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Nombre completo</label>
                          <input value={medicalForm.fullName ?? patientMedical?.fullName ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, fullName: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Teléfono</label>
                          <input value={medicalForm.phone ?? patientMedical?.phone ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+57..."
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Fecha de nacimiento</label>
                          <input type="date" value={medicalForm.birthdate ?? patientMedical?.birthdate ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, birthdate: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Tipo de sangre</label>
                          <select value={medicalForm.bloodType ?? patientMedical?.bloodType ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, bloodType: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm">
                            {BLOOD_TYPES.map(t => <option key={t} value={t}>{t || "Seleccionar..."}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Tipo de documento</label>
                          <select value={medicalForm.documentType ?? patientMedical?.documentType ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, documentType: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm">
                            <option value="">Seleccionar...</option>
                            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Número de documento</label>
                          <input value={medicalForm.documentNumber ?? patientMedical?.documentNumber ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, documentNumber: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Contacto de emergencia</label>
                          <input value={medicalForm.emergencyContact ?? patientMedical?.emergencyContact ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, emergencyContact: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Teléfono emergencia</label>
                          <input value={medicalForm.emergencyPhone ?? patientMedical?.emergencyPhone ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, emergencyPhone: e.target.value }))}
                            placeholder="+57..."
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">EPS / Aseguradora</label>
                          <input value={medicalForm.insuranceCompany ?? patientMedical?.insuranceCompany ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, insuranceCompany: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Número de seguro</label>
                          <input value={medicalForm.insuranceNumber ?? patientMedical?.insuranceNumber ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, insuranceNumber: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Método de ingreso</label>
                          <select value={medicalForm.entryMethod ?? patientMedical?.entryMethod ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, entryMethod: e.target.value }))}
                            className="w-full border rounded-xl px-3 py-2 text-sm">
                            <option value="">Seleccionar...</option>
                            {ENTRY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Dirección</label>
                          <input value={medicalForm.address ?? patientMedical?.address ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, address: e.target.value }))}
                            placeholder="Calle, barrio, ciudad"
                            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-muted-foreground block mb-1">Alergias</label>
                          <textarea value={medicalForm.allergies ?? patientMedical?.allergies ?? ""}
                            onChange={e => setMedicalForm(f => ({ ...f, allergies: e.target.value }))}
                            rows={2} placeholder="Ej: Penicilina, Polen..."
                            className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                      </div>
                      <button onClick={() => medicalMutation.mutate()} disabled={medicalMutation.isPending}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                        {medicalMutation.isPending ? "Guardando..." : "💾 Guardar historial y notificar paciente"}
                      </button>
                    </div>
                  )}
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

          {/* MATERIAL DE TRABAJO */}
          {view === "materiales" && (
            <div className="bg-card rounded-2xl border shadow-sm p-5 space-y-5 lg:col-span-2">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" /> Material de Trabajo
              </h2>
              <p className="text-sm text-muted-foreground">Sube videos, fotos y documentos que tus pacientes podrán ver para preparar sus terapias.</p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-emerald-800">Subir nuevo material</h3>
                <input
                  type="text"
                  placeholder="Titulo del material *"
                  value={matForm.title}
                  onChange={e => setMatForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Descripcion (opcional)"
                  value={matForm.description}
                  onChange={e => setMatForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
                <select
                  value={matForm.therapyType}
                  onChange={e => setMatForm(f => ({ ...f, therapyType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {THERAPY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="Psicología">Psicología</option>
                  <option value="Medicina General">Medicina General</option>
                </select>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={e => setMatFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                <button
                  disabled={!matFile || !matForm.title || isMatUploading}
                  onClick={async () => {
                    if (!matFile || !matForm.title) return;
                    setIsMatUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append("file", matFile);
                      fd.append("title", matForm.title);
                      fd.append("description", matForm.description);
                      fd.append("therapyType", matForm.therapyType);
                      const res = await fetch(`${BASE}/api/materials`, { method: "POST", credentials: "include", body: fd });
                      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                      toast({ title: "Material subido", description: "El material está disponible para los pacientes." });
                      setMatFile(null);
                      setMatForm({ title: "", description: "", therapyType: THERAPY_TYPES[0] });
                      qc.invalidateQueries({ queryKey: ["work-materials"] });
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    } finally {
                      setIsMatUploading(false);
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 hover:bg-emerald-700 transition-colors"
                >
                  {isMatUploading ? "Subiendo..." : "Subir Material"}
                </button>
              </div>

              {isMatLoading ? (
                <div className="flex justify-center py-8"><div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : workMaterials.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No hay materiales subidos aún.</p>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm">Materiales existentes ({workMaterials.length})</h3>
                  {workMaterials.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border">
                      <div className="flex items-center gap-3 min-w-0">
                        {m.fileType === "image" && <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                        {m.fileType === "video" && <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />}
                        {m.fileType === "document" && <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.therapyType} - {m.originalName}</p>
                          {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <a href={`${BASE}/api/materials/${m.id}/download`} target="_blank" rel="noopener noreferrer"
                          className="p-2 hover:bg-muted rounded-lg" title="Descargar">
                          <Download className="w-4 h-4" />
                        </a>
                        {(m.therapistId === user?.id || (user as any)?.role === "superadmin") && (
                          <button
                            onClick={async () => {
                              if (!confirm("¿Eliminar este material?")) return;
                              const res = await fetch(`${BASE}/api/materials/${m.id}`, { method: "DELETE", credentials: "include" });
                              if (res.ok) {
                                toast({ title: "Material eliminado" });
                                qc.invalidateQueries({ queryKey: ["work-materials"] });
                              }
                            }}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-destructive" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedPatient && view !== "assign" && view !== "citas" && view !== "horario" && view !== "materiales" && (
            <div className="bg-card rounded-2xl border flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">Selecciona un paciente para comenzar</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Reportar Error */}
      {errorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Reportar un Error
              </h2>
              <button onClick={() => setErrorModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Describe el error o problema que encontraste. El administrador recibirá un correo con tu reporte.
            </p>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Sección donde ocurrió</label>
              <input
                value={errorForm.section}
                onChange={e => setErrorForm(f => ({ ...f, section: e.target.value }))}
                placeholder="Ej: Prescripción de medicamentos"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">Descripción del error *</label>
              <textarea
                value={errorForm.description}
                onChange={e => setErrorForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="Describe el problema con el mayor detalle posible..."
                className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => errorReportMutation.mutate()}
                disabled={!errorForm.description.trim() || errorReportMutation.isPending}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded-xl disabled:opacity-50">
                {errorReportMutation.isPending ? "Enviando..." : "📤 Enviar reporte"}
              </button>
              <button onClick={() => setErrorModal(false)}
                className="flex-1 border text-sm font-bold py-2 rounded-xl hover:bg-muted">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
