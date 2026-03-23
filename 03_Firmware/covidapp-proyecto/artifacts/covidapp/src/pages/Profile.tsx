import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { User, Phone, MapPin, Heart, Shield, Save, Stethoscope, Bell } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const apiFetch = (path: string, opts?: RequestInit) =>
  fetch(`${BASE}/api${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "No sé"];
const DOC_TYPES = ["Cédula de Ciudadanía", "Tarjeta de Identidad", "Pasaporte", "Cédula de Extranjería", "NIT", "Otro"];
const EPS_LIST = ["Sura", "Nueva EPS", "Sanitas", "Compensar", "Famisanar", "Salud Total", "Comfenalco", "Otro", "No tiene"];
const ENTRY_METHODS = ["Voluntario", "Remitido", "Urgencias", "Orden médica", "Otro"];

type Section = "personal" | "medical" | "emergency" | "prefs" | "work";

export default function Profile() {
  const { user, isPatient, isTherapist, isNonMedicalAdmin } = useAuth();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("personal");
  const [form, setForm] = useState<any>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch("/profile").then(r => r.json()),
  });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/profile", { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Perfil actualizado", description: "Tus datos han sido guardados exitosamente." });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const set = (field: string, value: any) => setForm((f: any) => ({ ...f, [field]: value }));

  const save = () => {
    const payload: any = {
      fullName: form.fullName,
      phone: form.phone,
      address: form.address,
      birthdate: form.birthdate,
      documentType: form.documentType,
      documentNumber: form.documentNumber,
      bloodType: form.bloodType,
      emergencyContact: form.emergencyContact,
      emergencyPhone: form.emergencyPhone,
      allergies: form.allergies,
      insuranceCompany: form.insuranceCompany,
      insuranceNumber: form.insuranceNumber,
      entryMethod: form.entryMethod,
      preferredLanguage: form.preferredLanguage,
      emailNotifications: form.emailNotifications,
      jobTitle: form.jobTitle,
      department: form.department,
      specialization: form.specialization,
      licenseNumber: form.licenseNumber,
    };
    updateMutation.mutate(payload);
  };

  const sections = [
    { id: "personal", label: "Datos Personales", icon: <User className="w-4 h-4" /> },
    { id: "medical", label: "Info Médica", icon: <Heart className="w-4 h-4" /> },
    { id: "emergency", label: "Emergencia", icon: <Phone className="w-4 h-4" /> },
    { id: "prefs", label: "Preferencias", icon: <Bell className="w-4 h-4" /> },
    ...(!isPatient ? [{ id: "work" as Section, label: "Datos Laborales", icon: <Stethoscope className="w-4 h-4" /> }] : []),
  ];

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y preferencias.</p>
      </div>

      {/* Avatar y nombre */}
      <div className="bg-gradient-to-r from-primary to-primary/70 rounded-2xl p-6 text-primary-foreground mb-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl font-black">
          {(form.fullName || user?.username || "?")[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">{form.fullName || user?.username}</h2>
          <p className="opacity-80">{form.email}</p>
          <span className="mt-1 inline-block px-3 py-0.5 bg-white/20 rounded-full text-sm font-bold capitalize">
            {form.role === "patient" ? "Paciente" : form.role === "therapist" ? "Terapeuta" : form.role === "nonmedical_admin" ? "Admin No Médico" : form.role === "superadmin" ? "Superadmin" : form.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nav lateral */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden h-fit">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id as Section)}
              className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-left transition-colors border-b last:border-b-0 ${activeSection === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted/40"}`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <div className="lg:col-span-3 bg-card rounded-2xl border shadow-sm p-6 space-y-5">

          {activeSection === "personal" && (
            <>
              <h3 className="font-extrabold text-lg">Datos Personales</h3>
              <Grid2>
                <Field label="Nombre completo" value={form.fullName || ""} onChange={v => set("fullName", v)} />
                <Field label="Teléfono / Celular" value={form.phone || ""} onChange={v => set("phone", v)} icon="tel" />
                <SelectField label="Tipo de documento" value={form.documentType || ""} onChange={v => set("documentType", v)} options={DOC_TYPES} />
                <Field label="Número de documento" value={form.documentNumber || ""} onChange={v => set("documentNumber", v)} />
                <Field label="Fecha de nacimiento" value={form.birthdate || ""} onChange={v => set("birthdate", v)} icon="date" />
                <Field label="Dirección" value={form.address || ""} onChange={v => set("address", v)} />
              </Grid2>
            </>
          )}

          {activeSection === "medical" && (
            <>
              <h3 className="font-extrabold text-lg">Información Médica</h3>
              <Grid2>
                <SelectField label="Grupo sanguíneo" value={form.bloodType || ""} onChange={v => set("bloodType", v)} options={BLOOD_TYPES} />
                <Field label="Alergias conocidas" value={form.allergies || ""} onChange={v => set("allergies", v)} />
                <SelectField label="EPS / Seguro médico" value={form.insuranceCompany || ""} onChange={v => set("insuranceCompany", v)} options={EPS_LIST} />
                <Field label="N° de afiliación" value={form.insuranceNumber || ""} onChange={v => set("insuranceNumber", v)} />
                <SelectField label="Método de ingreso" value={form.entryMethod || ""} onChange={v => set("entryMethod", v)} options={ENTRY_METHODS} />
              </Grid2>
            </>
          )}

          {activeSection === "emergency" && (
            <>
              <h3 className="font-extrabold text-lg">Contacto de Emergencia</h3>
              <Grid2>
                <Field label="Nombre del contacto" value={form.emergencyContact || ""} onChange={v => set("emergencyContact", v)} />
                <Field label="Teléfono de emergencia" value={form.emergencyPhone || ""} onChange={v => set("emergencyPhone", v)} icon="tel" />
              </Grid2>
              <p className="text-sm text-muted-foreground">Este contacto será notificado en caso de emergencia médica.</p>
            </>
          )}

          {activeSection === "prefs" && (
            <>
              <h3 className="font-extrabold text-lg">Preferencias</h3>
              <div className="space-y-4">
                <SelectField label="Idioma preferido" value={form.preferredLanguage || "es"} onChange={v => set("preferredLanguage", v)}
                  options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} />
                <div className="flex items-center justify-between border rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold text-sm">Notificaciones por correo</p>
                    <p className="text-xs text-muted-foreground">Recibir recordatorios y alertas por email</p>
                  </div>
                  <button
                    onClick={() => set("emailNotifications", form.emailNotifications === "true" ? "false" : "true")}
                    className={`relative w-12 h-6 rounded-full transition-colors ${form.emailNotifications !== "false" ? "bg-primary" : "bg-muted"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.emailNotifications !== "false" ? "translate-x-7" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeSection === "work" && !isPatient && (
            <>
              <h3 className="font-extrabold text-lg">Datos Laborales</h3>
              <Grid2>
                <Field label="Cargo / Título" value={form.jobTitle || ""} onChange={v => set("jobTitle", v)} />
                <Field label="Departamento / Área" value={form.department || ""} onChange={v => set("department", v)} />
                <Field label="Especialización" value={form.specialization || ""} onChange={v => set("specialization", v)} />
                <Field label="Número de licencia / tarjeta profesional" value={form.licenseNumber || ""} onChange={v => set("licenseNumber", v)} />
              </Grid2>
            </>
          )}

          <div className="pt-2">
            <button
              onClick={save}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, value, onChange, icon }: { label: string; value: string; onChange: (v: string) => void; icon?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      <input
        type={icon === "tel" ? "tel" : icon === "date" ? "date" : "text"}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Seleccionar...</option>
        {options.map(o => typeof o === "string"
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}
