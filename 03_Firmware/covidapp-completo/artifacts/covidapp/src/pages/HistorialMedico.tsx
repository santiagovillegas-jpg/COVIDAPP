import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface HistorialData {
  nombreCompleto: string;
  edad: string;
  tipoSangre: string;
  alergias: string;
  enfermedades: string;
  medicamentos: string;
  contactoNombre: string;
  contactoTelefono: string;
}

const TIPO_SANGRE = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const EMPTY: HistorialData = {
  nombreCompleto: "",
  edad: "",
  tipoSangre: "",
  alergias: "",
  enfermedades: "",
  medicamentos: "",
  contactoNombre: "",
  contactoTelefono: "",
};

function storageKey(username: string) {
  return `historial_${username}`;
}

export default function HistorialMedico() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<HistorialData>(EMPTY);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(storageKey(user.username));
    if (raw) setForm(JSON.parse(raw));
  }, [user]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    localStorage.setItem(storageKey(user.username), JSON.stringify(form));
    setGuardado(true);
    toast({ title: "Historial guardado", description: "Tu historial médico fue actualizado." });
    setTimeout(() => setLocation("/bienvenida"), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">Editar Historial Médico</h1>

      <div className="bg-card rounded-2xl border shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Fila 1 */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-bold mb-1">Nombre Completo</label>
              <input
                name="nombreCompleto"
                value={form.nombreCompleto}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">Edad</label>
              <input
                name="edad"
                type="number"
                min="0"
                value={form.edad}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-bold mb-1">Tipo de Sangre</label>
              <select
                name="tipoSangre"
                value={form.tipoSangre}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIPO_SANGRE.map(t => (
                  <option key={t} value={t}>{t || "Seleccione..."}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Alergias */}
          <div>
            <label className="block text-sm font-bold mb-1">Alergias</label>
            <textarea
              name="alergias"
              value={form.alergias}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Penicilina, Polen..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Enfermedades */}
          <div>
            <label className="block text-sm font-bold mb-1">Enfermedades Crónicas</label>
            <textarea
              name="enfermedades"
              value={form.enfermedades}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Diabetes, Hipertensión..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Medicamentos */}
          <div>
            <label className="block text-sm font-bold mb-1">Medicamentos Actuales</label>
            <textarea
              name="medicamentos"
              value={form.medicamentos}
              onChange={handleChange}
              rows={2}
              placeholder="Ej: Metformina 500mg..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <hr className="border-border" />

          <h2 className="text-base font-bold text-foreground">Contacto de Emergencia</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Nombre del Contacto</label>
              <input
                name="contactoNombre"
                value={form.contactoNombre}
                onChange={handleChange}
                placeholder="Nombre completo"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Teléfono</label>
              <input
                name="contactoTelefono"
                type="tel"
                value={form.contactoTelefono}
                onChange={handleChange}
                placeholder="+57 ..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {guardado && (
            <p className="text-green-600 font-bold text-sm text-center">
              ✅ ¡Historial guardado exitosamente!
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Guardar Historial
            </button>
            <button
              type="button"
              onClick={() => setLocation("/bienvenida")}
              className="flex-1 border border-border py-2 rounded-xl font-bold text-sm hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
