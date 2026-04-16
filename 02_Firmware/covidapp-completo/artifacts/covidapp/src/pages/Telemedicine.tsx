import { useState } from "react";
import { Video, Copy, ExternalLink, Users, Shield, Wifi, CalendarX, CalendarCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGetAppointments } from "@workspace/api-client-react";
import { Link } from "wouter";

function generateRoomId(username: string) {
  const ts = Date.now().toString(36);
  return `covida-${username.toLowerCase().replace(/[^a-z0-9]/g, "")}-${ts}`;
}

export default function Telemedicine() {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [customRoom, setCustomRoom] = useState("");
  const [started, setStarted] = useState(false);

  const isPatient = user?.role === "patient";
  const isStaff = ["superadmin", "therapist", "nonmedical_admin"].includes(user?.role || "");

  const { data: appointments, isLoading: loadingAppts } = useGetAppointments({
    query: { enabled: isPatient },
  });

  const activeAppointments = appointments?.filter(
    (a: any) => a.status === "pending" || a.status === "confirmed"
  ) || [];

  const hasActiveAppointment = activeAppointments.length > 0;
  const canUseVideo = isStaff || hasActiveAppointment;

  const createRoom = () => {
    if (!canUseVideo) return;
    const id = generateRoomId(user?.username || "paciente");
    setRoomId(id);
    setStarted(true);
  };

  const joinRoom = () => {
    if (!canUseVideo) return;
    if (!customRoom.trim()) {
      toast({ title: "Codigo de sala requerido", description: "Ingrese el codigo de sala proporcionado por su terapeuta.", variant: "destructive" });
      return;
    }
    const id = customRoom.trim().replace(/^https?:\/\/meet\.jit\.si\//i, "");
    setRoomId(id);
    setStarted(true);
  };

  const meetUrl = roomId ? `https://meet.jit.si/${roomId}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(meetUrl);
    toast({ title: "Enlace copiado", description: "Comparte este enlace con tu terapeuta." });
  };

  if (loadingAppts && isPatient) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Telemedicina</h1>
        <p className="text-muted-foreground text-sm">Consultas en linea con tu terapeuta mediante videollamada segura.</p>
      </div>

      {isPatient && !hasActiveAppointment && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center space-y-4">
          <CalendarX className="w-16 h-16 text-orange-400 mx-auto" />
          <h2 className="text-xl font-bold text-orange-800">No tienes citas activas</h2>
          <p className="text-orange-700 max-w-md mx-auto">
            Para usar la videollamada necesitas tener al menos una cita pendiente o confirmada con tu terapeuta.
          </p>
          <Link href="/citas">
            <button className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors mt-2">
              Agendar una cita
            </button>
          </Link>
        </div>
      )}

      {isPatient && hasActiveAppointment && !started && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <CalendarCheck className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-800 text-sm">Tienes {activeAppointments.length} cita(s) activa(s)</p>
            <p className="text-green-700 text-xs mt-0.5">Puedes iniciar o unirte a una videollamada con tu terapeuta.</p>
          </div>
        </div>
      )}

      {canUseVideo && !started && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="font-extrabold text-xl">Iniciar nueva videollamada</h2>
            <p className="text-muted-foreground text-sm">Crea una sala nueva y comparte el enlace con tu terapeuta o medico tratante.</p>
            <button
              onClick={createRoom}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
            >
              Crear sala de videollamada
            </button>
          </div>

          <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-extrabold text-xl">Unirse a una sala</h2>
            <p className="text-muted-foreground text-sm">Ingresa el codigo de sala que te envio tu terapeuta.</p>
            <input
              value={customRoom}
              onChange={e => setCustomRoom(e.target.value)}
              placeholder="Codigo de sala (ej: covida-terapeuta1-...)"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={joinRoom}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors"
            >
              Unirse a la sala
            </button>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Shield className="w-5 h-5 text-green-600" />, title: "Conexion segura", desc: "Cifrado de extremo a extremo en todas las videollamadas." },
              { icon: <Wifi className="w-5 h-5 text-blue-600" />, title: "Sin instalacion", desc: "Funciona directamente en el navegador, sin descargas." },
              { icon: <Users className="w-5 h-5 text-purple-600" />, title: "Hasta 50 participantes", desc: "Puedes incluir multiples terapeutas o familiares." },
            ].map(card => (
              <div key={card.title} className="bg-card rounded-xl border p-4 flex gap-3">
                <div className="flex-shrink-0 mt-0.5">{card.icon}</div>
                <div>
                  <p className="font-bold text-sm">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {started && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-bold text-green-800">Sala activa: <code className="text-sm">{roomId}</code></p>
              <p className="text-sm text-green-700 mt-0.5">Comparte este enlace con tu terapeuta para que se una.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white text-sm font-bold rounded-lg">
                <Copy className="w-4 h-4" /> Copiar enlace
              </button>
              <a href={meetUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-green-700 text-green-700 text-sm font-bold rounded-lg">
                <ExternalLink className="w-4 h-4" /> Abrir en nueva pestana
              </a>
            </div>
          </div>

          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden" style={{ height: "600px" }}>
            <iframe
              src={`https://meet.jit.si/${roomId}#userInfo.displayName="${encodeURIComponent(user?.fullName || user?.username || "Paciente")}"`}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="w-full h-full border-0"
              title="Sala de telemedicina COVIDA"
            />
          </div>

          <div className="flex justify-end">
            <button onClick={() => { setStarted(false); setRoomId(""); setCustomRoom(""); }}
              className="px-4 py-2 border rounded-xl text-sm font-bold hover:bg-muted">
              Terminar consulta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
