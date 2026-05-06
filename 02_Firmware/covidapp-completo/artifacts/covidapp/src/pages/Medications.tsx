import { useQuery } from "@tanstack/react-query";
import { Pill, Calendar, User, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (path: string) =>
  fetch(`${BASE}/api/medications${path}`, { credentials: "include" }).then(r => r.json());

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral", topical: "Tópica", injectable: "Inyectable",
  sublingual: "Sublingual", inhaled: "Inhalada", other: "Otro",
};

export default function Medications() {
  const { data: medications = [], isLoading } = useQuery({
    queryKey: ["my-medications"],
    queryFn: () => api("/my"),
  });

  const active = medications.filter((m: any) => m.isActive);
  const inactive = medications.filter((m: any) => !m.isActive);

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const printPrescription = () => {
    const activeMeds = medications.filter((m: any) => m.isActive);
    if (activeMeds.length === 0) return;
    const lines = activeMeds.map((m: any) =>
      `• ${m.medicineName} — ${m.dosage} — ${m.frequency} (${ROUTE_LABELS[m.routeOfAdmin] || m.routeOfAdmin || "Oral"})\n  ${m.instructions || ""}`
    ).join("\n");

    const html = `
      <html><head><title>Nota de Medicamentos</title>
      <style>body{font-family:serif;padding:40px;max-width:700px;margin:auto}
      h1{font-size:22px}p{color:#666}pre{background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap}
      .footer{margin-top:40px;border-top:1px solid #ddd;padding-top:16px;color:#888;font-size:12px}</style></head>
      <body>
        <h1>🏥 Nota de Medicamentos — COVIDA</h1>
        <p>Fundación de Rehabilitación | Universidad del Quindío, Armenia, Colombia</p>
        <p>Fecha: ${new Date().toLocaleDateString("es-CO", { dateStyle: "full" })}</p>
        <h3>Medicamentos Activos</h3>
        <pre>${lines}</pre>
        <div class="footer">Este documento es generado automáticamente por COVIDAPP. Preséntelo a su farmacia de confianza.</div>
      </body></html>`;
    const w = window.open("", "_blank");
    w?.document.write(html);
    w?.document.close();
    w?.print();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Mis Medicamentos</h1>
          <p className="text-muted-foreground text-sm">Recetas y dosis actuales prescritas por tu médico tratante.</p>
        </div>
        {active.length > 0 && (
          <button onClick={printPrescription}
            className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold hover:bg-muted">
            <FileText className="w-4 h-4" /> Descargar nota para farmacia
          </button>
        )}
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border">
          <Pill className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No tienes medicamentos recetados aún.</p>
          <p className="text-sm mt-1">Tu médico tratante publicará tus recetas aquí.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Recetas Activas ({active.length})</h2>
              <div className="space-y-3">
                {active.map((m: any) => (
                  <MedCard key={m.id} med={m} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Historial ({inactive.length})</h2>
              <div className="space-y-3 opacity-60">
                {inactive.map((m: any) => (
                  <MedCard key={m.id} med={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MedCard({ med }: { med: any }) {
  const isExpired = med.endDate && new Date(med.endDate) < new Date();

  return (
    <div className={`bg-card rounded-2xl border p-5 shadow-sm ${!med.isActive ? "border-dashed" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">💊</div>
          <div>
            <h3 className="font-extrabold">{med.medicineName}</h3>
            <p className="text-sm text-muted-foreground">{med.dosage} · {med.frequency}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${med.isActive && !isExpired ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
          {med.isActive && !isExpired ? "✅ Activa" : isExpired ? "Vencida" : "Inactiva"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Pill className="w-4 h-4" />
          <span>Vía: {ROUTE_LABELS[med.routeOfAdmin] || med.routeOfAdmin || "Oral"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Dr. {med.prescribedByName || "Médico"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Inicio: {new Date(med.startDate).toLocaleDateString("es-CO")}</span>
        </div>
        {med.endDate && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Fin: {new Date(med.endDate).toLocaleDateString("es-CO")}</span>
          </div>
        )}
      </div>

      {med.instructions && (
        <div className="mt-3 bg-muted/30 rounded-xl p-3 text-sm">
          <span className="font-bold text-xs text-muted-foreground">Instrucciones: </span>
          {med.instructions}
        </div>
      )}
    </div>
  );
}
