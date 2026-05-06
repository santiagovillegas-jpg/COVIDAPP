import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Image, Video, Download, Eye, Search, Filter } from "lucide-react";

interface WorkMaterial {
  id: number;
  therapistId: number;
  therapistName: string | null;
  therapyType: string;
  title: string;
  description: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

const THERAPY_COLORS: Record<string, string> = {
  "Terapia Física": "bg-blue-100 text-blue-700",
  "Terapia del Habla": "bg-purple-100 text-purple-700",
  "Terapia Ocupacional": "bg-orange-100 text-orange-700",
  "Psicología": "bg-green-100 text-green-700",
  "Terapia Cognitiva": "bg-teal-100 text-teal-700",
};

export default function WorkMaterials() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFileType, setFilterFileType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewMaterial, setPreviewMaterial] = useState<WorkMaterial | null>(null);

  const { data: materials = [], isLoading } = useQuery<WorkMaterial[]>({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      const res = await fetch("/api/materials", { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener materiales");
      return res.json();
    },
  });

  const therapyTypes = [...new Set(materials.map(m => m.therapyType))];

  const filtered = materials.filter(m => {
    if (filterType !== "all" && m.therapyType !== filterType) return false;
    if (filterFileType !== "all" && m.fileType !== filterFileType) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fileIcon = (type: string) => {
    if (type === "image") return <Image className="w-5 h-5" />;
    if (type === "video") return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary" /> Material de Trabajo
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Material preparado por tus terapeutas para que puedas prepararte para tus citas y realizar tus ejercicios.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todas las terapias</option>
          {therapyTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filterFileType}
          onChange={e => setFilterFileType(e.target.value)}
          className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Todos los tipos</option>
          <option value="image">Fotos</option>
          <option value="video">Videos</option>
          <option value="document">Documentos</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {materials.length === 0
              ? "Aún no hay material de trabajo disponible para tus terapias."
              : "No se encontraron materiales con los filtros seleccionados."}
          </p>
          {materials.length === 0 && (
            <p className="text-muted-foreground text-sm mt-1">Tu terapeuta subirá material pronto.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(material => (
            <div key={material.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {material.fileType === "image" && (
                <div className="h-40 bg-muted overflow-hidden">
                  <img
                    src={`/api/materials/${material.id}/preview`}
                    alt={material.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              {material.fileType === "video" && (
                <div className="h-40 bg-black overflow-hidden">
                  <video
                    src={`/api/materials/${material.id}/preview`}
                    className="w-full h-full object-contain"
                    controls
                    preload="metadata"
                  />
                </div>
              )}
              {material.fileType === "document" && (
                <div className="h-40 bg-muted/50 flex items-center justify-center">
                  <FileText className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm leading-tight">{material.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${THERAPY_COLORS[material.therapyType] || "bg-gray-100 text-gray-700"}`}>
                    {material.therapyType}
                  </span>
                </div>
                {material.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{material.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {fileIcon(material.fileType)}
                  <span>{formatSize(material.fileSize)}</span>
                  <span>-</span>
                  <span>{formatDate(material.uploadedAt)}</span>
                </div>
                {material.therapistName && (
                  <p className="text-xs text-muted-foreground">Subido por: {material.therapistName}</p>
                )}
                <div className="flex gap-2 pt-1">
                  {(material.fileType === "image" || material.fileType === "video") && (
                    <button
                      onClick={() => setPreviewMaterial(material)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                  )}
                  <a
                    href={`/api/materials/${material.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewMaterial && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewMaterial(null)}>
          <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">{previewMaterial.title}</h3>
                {previewMaterial.description && <p className="text-sm text-muted-foreground">{previewMaterial.description}</p>}
              </div>
              <button onClick={() => setPreviewMaterial(null)} className="p-2 hover:bg-muted rounded-lg text-sm font-bold">Cerrar</button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/5 max-h-[70vh] overflow-auto">
              {previewMaterial.fileType === "image" && (
                <img src={`/api/materials/${previewMaterial.id}/preview`} alt={previewMaterial.title} className="max-w-full max-h-[65vh] object-contain" />
              )}
              {previewMaterial.fileType === "video" && (
                <video src={`/api/materials/${previewMaterial.id}/preview`} controls autoPlay className="max-w-full max-h-[65vh]" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
