import { useState } from "react";
import { Video, Copy, ExternalLink, Users, Shield, Wifi } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function generateRoomId(username: string) {
  const ts = Date.now().toString(36);
  return `covida-${username.toLowerCase().replace(/[^a-z0-9]/g, "")}-${ts}`;
}

export default function Telemedicine() {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [customRoom, setCustomRoom] = useState("");
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<"new" | "join">("new");

  const createRoom = () => {
    const id = generateRoomId(user?.username || "paciente");
    setRoomId(id);
    setStarted(true);
  };

  const joinRoom = () => {
    if (!customRoom.trim()) {
      toast({ title: "Código de sala requerido", description: "Ingrese el código de sala proporcionado por su terapeuta.", variant: "destructive" });
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Telemedicina</h1>
        <p className="text-muted-foreground text-sm">Consultas en línea con tu terapeuta mediante videollamada segura.</p>
      </div>

      {!started ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="font-extrabold text-xl">Iniciar nueva videollamada</h2>
            <p className="text-muted-foreground text-sm">Crea una sala nueva y comparte el enlace con tu terapeuta o médico tratante.</p>
            <button
              onClick={createRoom}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors"
            >
              🎥 Crear sala de videollamada
            </button>
          </div>

          <div className="bg-card rounded-2xl border shadow-sm p-6 space-y-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="font-extrabold text-xl">Unirse a una sala</h2>
            <p className="text-muted-foreground text-sm">Ingresa el código de sala que te envió tu terapeuta.</p>
            <input
              value={customRoom}
              onChange={e => setCustomRoom(e.target.value)}
              placeholder="Código de sala (ej: covida-terapeuta1-...)"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={joinRoom}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-colors"
            >
              🔗 Unirse a la sala
            </button>
          </div>

          {/* Info cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Shield className="w-5 h-5 text-green-600" />, title: "Conexión segura", desc: "Cifrado de extremo a extremo en todas las videollamadas." },
              { icon: <Wifi className="w-5 h-5 text-blue-600" />, title: "Sin instalación", desc: "Funciona directamente en el navegador, sin descargas." },
              { icon: <Users className="w-5 h-5 text-purple-600" />, title: "Hasta 50 participantes", desc: "Puedes incluir múltiples terapeutas o familiares." },
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
      ) : (
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
                <ExternalLink className="w-4 h-4" /> Abrir en nueva pestaña
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
