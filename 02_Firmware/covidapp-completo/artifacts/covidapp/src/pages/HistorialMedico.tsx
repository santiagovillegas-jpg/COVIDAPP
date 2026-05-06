import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Phone, MapPin, Calendar, Droplets, AlertTriangle, Shield, User, Briefcase } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) =>
  fetch(`${BASE}/api${path}`, { credentials: "include" }).then(r => r.json());

const FIELD_META: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "fullName",         label: "Nombre completo",       icon: <User className="w-4 h-4" /> },
  { key: "email",            label: "Correo electrónico",     icon: <FileText className="w-4 h-4" /> },
  { key: "phone",            label: "Teléfono",               icon: <Phone className="w-4 h-4" /> },
  { key: "birthdate",        label: "Fecha de nacimiento",    icon: <Calendar className="w-4 h-4" /> },
  { key: "address",          label: "Dirección",              icon: <MapPin className="w-4 h-4" /> },
  { key: "documentType",     label: "Tipo de documento",      icon: <FileText className="w-4 h-4" /> },
  { key: "documentNumber",   label: "Número de documento",    icon: <FileText className="w-4 h-4" /> },
  { key: "bloodType",        label: "Tipo de sangre",         icon: <Droplets className="w-4 h-4" /> },
  { key: "allergies",        label: "Alergias",               icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "emergencyContact", label: "Contacto de emergencia", icon: <Phone className="w-4 h-4" /> },
  { key: "emergencyPhone",   label: "Teléfono de emergencia", icon: <Phone className="w-4 h-4" /> },
  { key: "insuranceCompany", label: "EPS / Aseguradora",      icon: <Shield className="w-4 h-4" /> },
  { key: "insuranceNumber",  label: "Número de seguro",       icon: <Shield className="w-4 h-4" /> },
  { key: "entryMethod",      label: "Método de ingreso",      icon: <Briefcase className="w-4 h-4" /> },
];

export default function HistorialMedico() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api("/profile"),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Datos Personales</h1>
          <p className="text-sm text-muted-foreground">
            Tu información personal y médica registrada en el sistema.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          Esta información solo puede ser actualizada por tu terapeuta asignado. Si necesitas modificar algún dato, comunícate con él directamente.
        </p>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="divide-y">
          {FIELD_META.map(({ key, label, icon }) => {
            const value = profile?.[key];
            return (
              <div key={key} className="flex items-start gap-4 px-6 py-4">
                <div className="mt-0.5 text-muted-foreground flex-shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  <p className="text-sm text-foreground font-medium break-words">
                    {value || <span className="text-muted-foreground italic font-normal">Sin registrar</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground pb-4">
        © 2025 Universidad del Quindío | Alpha build v0.0.1
      </p>
    </div>
  );
}
