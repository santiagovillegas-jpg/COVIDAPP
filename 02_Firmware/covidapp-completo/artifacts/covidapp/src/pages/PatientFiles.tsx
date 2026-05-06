import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Image, Video, Download, FolderOpen, Upload, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  if (type === "image") return <Image className={`${className} text-blue-500`} />;
  if (type === "video") return <Video className={`${className} text-purple-500`} />;
  return <FileText className={`${className} text-orange-500`} />;
}

export default function PatientFiles() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [storageFile, setStorageFile] = useState<File | null>(null);
  const [storageDesc, setStorageDesc] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Files sent by therapist
  const { data: receivedFiles = [], isLoading: isReceivedLoading } = useQuery<any[]>({
    queryKey: ["patient-files-my"],
    queryFn: () => fetch(`${BASE}/api/files/my`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user,
  });

  // Personal storage
  const { data: myStorage = [], isLoading: isStorageLoading } = useQuery<any[]>({
    queryKey: ["patient-storage"],
    queryFn: () => fetch(`${BASE}/api/files/storage`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user,
  });

  const handleStorageUpload = async () => {
    if (!storageFile) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", storageFile);
      if (storageDesc) fd.append("description", storageDesc);
      const res = await fetch(`${BASE}/api/files/storage`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) { toast({ title: "Error", description: data.error || "No se pudo subir", variant: "destructive" }); return; }
      toast({ title: "Archivo guardado en tu almacenamiento" });
      setStorageFile(null);
      setStorageDesc("");
      qc.invalidateQueries({ queryKey: ["patient-storage"] });
    } catch {
      toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStorage = async (fileId: number, name: string) => {
    if (!confirm(`¿Eliminar "${name}" de tu almacenamiento?`)) return;
    const res = await fetch(`${BASE}/api/files/storage/${fileId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      toast({ title: "Archivo eliminado" });
      qc.invalidateQueries({ queryKey: ["patient-storage"] });
    }
  };

  const images = receivedFiles.filter(f => f.fileType === "image");
  const videos = receivedFiles.filter(f => f.fileType === "video");
  const docs = receivedFiles.filter(f => f.fileType === "document");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <FolderOpen className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-extrabold">Mis Archivos</h1>
          <p className="text-sm text-muted-foreground">Documentos enviados por tu terapeuta y tu almacenamiento personal</p>
        </div>
      </div>

      {/* ── PERSONAL STORAGE ── */}
      <section className="bg-card rounded-2xl border shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-500" /> Mi Almacenamiento Personal
        </h2>
        <p className="text-xs text-muted-foreground">Sube tus propios archivos aquí. Solo tú y los administradores tienen acceso.</p>

        {/* Upload */}
        <div className="border rounded-xl p-3 space-y-2 bg-indigo-50/30">
          <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${storageFile ? "border-indigo-400 bg-indigo-50" : "border-muted-foreground/30 hover:border-indigo-400/60"}`}>
            <input type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" onChange={e => setStorageFile(e.target.files?.[0] || null)} />
            {storageFile ? (
              <div className="text-center px-4">
                <p className="font-bold text-sm text-indigo-600 truncate max-w-xs">{storageFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(storageFile.size)} · click para cambiar</p>
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
            <button onClick={handleStorageUpload} disabled={!storageFile || isUploading} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> {isUploading ? "Subiendo..." : "Guardar"}
            </button>
          </div>
        </div>

        {/* Storage list */}
        {isStorageLoading ? (
          <div className="flex justify-center py-4"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : myStorage.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">Tu almacenamiento está vacío.</p>
        ) : (
          <div className="space-y-2">
            {myStorage.map((f: any) => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                <FileIcon type={f.fileType} className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.originalName}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(f.fileSize)}{f.description ? ` · ${f.description}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{new Date(f.uploadedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={`${BASE}/api/files/storage/${f.id}/download`} download={f.originalName} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Descargar"><Download className="w-4 h-4" /></a>
                  <button onClick={() => handleDeleteStorage(f.id, f.originalName)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── FILES FROM THERAPIST ── */}
      <section className="space-y-6">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Archivos de mi terapeuta
        </h2>

        {isReceivedLoading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : receivedFiles.length === 0 ? (
          <div className="bg-card rounded-2xl border p-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-30" />
            <p className="font-medium text-muted-foreground">Aún no tienes archivos de tu terapeuta</p>
            <p className="text-xs text-muted-foreground mt-1">Cuando tu terapeuta te envíe un archivo, aparecerá aquí.</p>
          </div>
        ) : (
          <>
            {/* Images */}
            {images.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Image className="w-4 h-4 text-blue-500" /> Imágenes ({images.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((f: any) => (
                    <div key={f.id} className="group relative bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <img src={`${BASE}/api/files/${f.id}/download`} alt={f.originalName} className="w-full h-32 object-cover" />
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{f.originalName}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.fileSize)}</p>
                        {f.description && <p className="text-xs text-muted-foreground italic truncate">{f.description}</p>}
                        <p className="text-xs text-muted-foreground">Por: {f.therapistName}</p>
                      </div>
                      <a href={`${BASE}/api/files/${f.id}/download`} download={f.originalName} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Descargar"><Download className="w-3 h-3" /></a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Video className="w-4 h-4 text-purple-500" /> Videos ({videos.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map((f: any) => (
                    <div key={f.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                      <video src={`${BASE}/api/files/${f.id}/download`} controls className="w-full max-h-48 bg-black" />
                      <div className="p-3 flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{f.originalName}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(f.fileSize)} · {f.therapistName}</p>
                          {f.description && <p className="text-xs text-muted-foreground italic">{f.description}</p>}
                        </div>
                        <a href={`${BASE}/api/files/${f.id}/download`} download={f.originalName} className="ml-2 p-2 bg-muted rounded-lg hover:bg-muted/70" title="Descargar"><Download className="w-4 h-4" /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {docs.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><FileText className="w-4 h-4 text-orange-500" /> Documentos ({docs.length})</h3>
                <div className="space-y-2">
                  {docs.map((f: any) => (
                    <div key={f.id} className="bg-card border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <FileIcon type={f.fileType} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{f.originalName}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.fileSize)} · Enviado por {f.therapistName}</p>
                        {f.description && <p className="text-xs text-muted-foreground italic mt-0.5">{f.description}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(f.uploadedAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                      <a href={`${BASE}/api/files/${f.id}/download`} download={f.originalName} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 flex-shrink-0">
                        <Download className="w-3.5 h-3.5" /> Descargar
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
