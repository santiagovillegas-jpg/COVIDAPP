import { useState, useEffect } from "react";
import {
  useGetAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  useSendAppointmentReminder,
  getGetAppointmentsQueryKey,
  Appointment
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CalendarPlus, Mail, Trash2, CalendarDays, User as UserIcon, Clock, CheckCircle, ArrowLeft, Stethoscope } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const THERAPY_TYPES = [
  { label: "Terapia Física", icon: "💪", desc: "Rehabilitación motora y física" },
  { label: "Terapia del Habla", icon: "🗣️", desc: "Fonoaudiología y lenguaje" },
  { label: "Terapia Ocupacional", icon: "🤲", desc: "Actividades funcionales diarias" },
  { label: "Terapia Cognitiva", icon: "🧠", desc: "Estimulación cognitiva y neuropsicología" },
  { label: "Psicología", icon: "🧘", desc: "Atención psicológica clínica" },
];

interface Doctor {
  id: number;
  fullName: string;
  specialization: string;
  jobTitle: string;
  department: string;
}

interface DoctorSchedule {
  id: number;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

interface Slot {
  time: string;
  available: boolean;
}

type BookingStep = "therapy" | "doctor" | "datetime" | "confirm";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Appointments() {
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useGetAppointments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<BookingStep>("therapy");
  const [selectedTherapy, setSelectedTherapy] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSchedule, setNoSchedule] = useState(false);
  const [notes, setNotes] = useState("");
  const [reminderEmail, setReminderEmail] = useState("");
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [doctorSchedules, setDoctorSchedules] = useState<Record<number, DoctorSchedule[]>>({});
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  const createMut = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cita agendada", description: `Tu cita de ${selectedTherapy} con ${selectedDoctor?.fullName} fue creada.`, variant: "success" });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        closeDialog();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "No se pudo crear la cita", variant: "destructive" });
      }
    }
  });

  const deleteMut = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cita cancelada", description: "Tu cita ha sido cancelada exitosamente.", variant: "default" });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "No se puede cancelar", description: err.message || "Error al cancelar la cita", variant: "destructive" });
      }
    }
  });

  const reminderMut = useSendAppointmentReminder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Recordatorio enviado", description: "El correo ha sido programado.", variant: "success" });
      },
      onError: () => {
        toast({ title: "Error", description: "No se pudo enviar el correo.", variant: "destructive" });
      }
    }
  });

  useEffect(() => {
    const loadDoctorsAndSchedules = async () => {
      try {
        const res = await fetch(`${BASE}/api/doctors`, { credentials: "include" });
        const docs: Doctor[] = await res.json();
        setAllDoctors(docs);
        const schedMap: Record<number, DoctorSchedule[]> = {};
        await Promise.all(docs.map(async (doc) => {
          const sRes = await fetch(`${BASE}/api/doctors/${doc.id}/schedules`, { credentials: "include" });
          const scheds: DoctorSchedule[] = await sRes.json();
          schedMap[doc.id] = scheds.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        }));
        setDoctorSchedules(schedMap);
      } catch { }
      setLoadingSchedules(false);
    };
    loadDoctorsAndSchedules();
  }, []);

  const closeDialog = () => {
    setDialogOpen(false);
    setStep("therapy");
    setSelectedTherapy("");
    setDoctors([]);
    setSelectedDoctor(null);
    setSelectedDate("");
    setSlots([]);
    setSelectedSlot("");
    setNoSchedule(false);
    setNotes("");
    setReminderEmail("");
  };

  const openCreate = () => {
    closeDialog();
    setDialogOpen(true);
  };

  const selectTherapy = async (therapy: string) => {
    setSelectedTherapy(therapy);
    setLoadingDoctors(true);
    try {
      const res = await fetch(`${BASE}/api/doctors/by-therapy/${encodeURIComponent(therapy)}`, { credentials: "include" });
      const data: Doctor[] = await res.json();
      setDoctors(data);
      const newScheds = { ...doctorSchedules };
      await Promise.all(data.filter(d => !newScheds[d.id]).map(async (doc) => {
        const sRes = await fetch(`${BASE}/api/doctors/${doc.id}/schedules`, { credentials: "include" });
        const scheds: DoctorSchedule[] = await sRes.json();
        newScheds[doc.id] = scheds.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }));
      setDoctorSchedules(newScheds);
      setStep("doctor");
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los doctores", variant: "destructive" });
    } finally {
      setLoadingDoctors(false);
    }
  };

  const selectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setSelectedDate("");
    setSlots([]);
    setSelectedSlot("");
    setNoSchedule(false);
    setStep("datetime");
  };

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setNoSchedule(false);
      try {
        const res = await fetch(`${BASE}/api/doctors/${selectedDoctor.id}/availability?date=${selectedDate}`, { credentials: "include" });
        const data = await res.json();
        if (!data.available) {
          setSlots([]);
          setNoSchedule(true);
        } else {
          setSlots(data.slots);
          setNoSchedule(false);
        }
      } catch {
        toast({ title: "Error", description: "No se pudo cargar disponibilidad", variant: "destructive" });
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  const handleConfirm = () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    const appointmentDate = `${selectedDate}T${selectedSlot}:00.000Z`;
    createMut.mutate({
      therapyType: selectedTherapy,
      doctorId: selectedDoctor.id,
      appointmentDate,
      notes: notes || undefined,
      reminderEmail: reminderEmail || undefined,
    });
  };

  const canCancel = (appt: Appointment) => {
    if (appt.status === "cancelled" || appt.status === "completed") return false;
    const apptDate = new Date(appt.appointmentDate);
    const hoursUntil = (apptDate.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntil >= 24;
  };

  const handleCancel = (id: number) => {
    if (confirm("¿Estás seguro de que deseas cancelar esta cita? Solo puedes cancelar con al menos 24 horas de anticipación.")) {
      deleteMut.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">Pendiente</Badge>;
      case 'confirmed': return <Badge variant="success">Confirmada</Badge>;
      case 'completed': return <Badge variant="default">Completada</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display">Tus Terapias</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus citas y recordatorios.</p>
        </div>
        <Button onClick={openCreate} size="lg" className="shadow-primary/30 shadow-lg w-full sm:w-auto">
          <CalendarPlus className="w-5 h-5 mr-2" /> Agendar Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Card key={i} className="h-64 animate-pulse bg-muted/50" />)}
        </div>
      ) : appointments?.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No hay citas programadas</h3>
          <p className="text-muted-foreground mb-6">Agenda tu primera terapia de rehabilitación.</p>
          <Button onClick={openCreate}>Comenzar ahora</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments?.map(appt => (
            <Card key={appt.id} className="overflow-hidden flex flex-col hover:shadow-xl hover:border-primary/30 transition-all group">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-primary">{appt.therapyType}</h3>
                  {getStatusBadge(appt.status)}
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-foreground/50" />
                    <span className="font-medium text-foreground">
                      {format(parseISO(appt.appointmentDate), "PPpp", { locale: es })}
                    </span>
                  </div>
                  {appt.therapistName && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-foreground/50" />
                      <span>{appt.therapistName}</span>
                    </div>
                  )}
                  {appt.notes && (
                    <div className="p-3 bg-muted rounded-lg mt-4 text-xs italic">"{appt.notes}"</div>
                  )}
                </div>
              </div>
              <div className="bg-muted/30 border-t p-4 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs"
                  onClick={() => reminderMut.mutate({ id: appt.id })}
                  isLoading={reminderMut.isPending && reminderMut.variables?.id === appt.id}>
                  <Mail className="w-4 h-4 mr-1.5" /> Recordar
                </Button>
                {canCancel(appt) ? (
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs" onClick={() => handleCancel(appt.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                ) : appt.status !== "cancelled" && appt.status !== "completed" ? (
                  <span className="text-xs text-muted-foreground italic">No cancelable (&lt;24h)</span>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── BOOKING DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }} title="Agendar Cita">
        <div className="space-y-4 min-h-[300px]">
          {/* Step indicator */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <span className={step === "therapy" ? "font-bold text-primary" : ""}>Tipo</span>
            <span>→</span>
            <span className={step === "doctor" ? "font-bold text-primary" : ""}>Doctor</span>
            <span>→</span>
            <span className={step === "datetime" ? "font-bold text-primary" : ""}>Horario</span>
            <span>→</span>
            <span className={step === "confirm" ? "font-bold text-primary" : ""}>Confirmar</span>
          </div>

          {/* STEP: Select therapy type */}
          {step === "therapy" && (
            <div className="space-y-3">
              <h3 className="font-bold text-lg">¿Qué tipo de terapia necesitas?</h3>
              {loadingDoctors ? (
                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {THERAPY_TYPES.map(t => (
                    <button key={t.label} onClick={() => selectTherapy(t.label)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-left">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <p className="font-bold text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP: Select doctor */}
          {step === "doctor" && (
            <div className="space-y-3">
              <button onClick={() => setStep("therapy")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-3.5 h-3.5" /> Cambiar tipo de terapia
              </button>
              <h3 className="font-bold text-lg">Selecciona tu doctor para {selectedTherapy}</h3>
              {doctors.length === 0 ? (
                <div className="text-center py-6 bg-muted/30 rounded-xl">
                  <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No hay doctores disponibles para esta especialidad.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.map(doc => {
                    const scheds = doctorSchedules[doc.id] || [];
                    return (
                      <div key={doc.id} className="rounded-xl border hover:border-primary hover:bg-primary/5 transition-all">
                        <button onClick={() => selectDoctor(doc)}
                          className="w-full flex items-center gap-3 p-4 text-left">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {doc.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{doc.fullName}</p>
                            <p className="text-xs text-muted-foreground">{doc.jobTitle} · {doc.department}</p>
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{doc.specialization}</Badge>
                        </button>
                        {scheds.length > 0 && (
                          <div className="px-4 pb-3 pt-0">
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Horarios de atención:</p>
                            <div className="space-y-1">
                              {scheds.map(s => (
                                <div key={s.id} className="flex items-center justify-between text-xs px-2.5 py-1 rounded-md bg-muted/40">
                                  <span className="font-medium text-foreground/70 w-20">{DAY_NAMES[s.dayOfWeek]}</span>
                                  <span className="text-primary font-semibold">{s.startTime} - {s.endTime}</span>
                                  <span className="text-muted-foreground">{s.slotDurationMinutes} min</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP: Select date & time */}
          {step === "datetime" && selectedDoctor && (
            <div className="space-y-3">
              <button onClick={() => setStep("doctor")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-3.5 h-3.5" /> Cambiar doctor
              </button>
              <h3 className="font-bold text-lg">Horario de {selectedDoctor.fullName}</h3>
              <p className="text-xs text-muted-foreground">{selectedDoctor.jobTitle} · {selectedDoctor.specialization}</p>

              <div className="space-y-1">
                <label className="text-sm font-bold">Selecciona una fecha</label>
                <input type="date" min={todayStr} value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(""); }}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {selectedDate && (
                loadingSlots ? (
                  <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
                ) : noSchedule ? (
                  <div className="text-center py-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-700 font-medium">El doctor no atiende este día</p>
                    <p className="text-xs text-amber-600 mt-1">Selecciona otra fecha.</p>
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay horarios configurados.</p>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Horarios disponibles</label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                      {slots.map(s => (
                        <button key={s.time} disabled={!s.available}
                          onClick={() => setSelectedSlot(s.time)}
                          className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                            !s.available ? "bg-muted/50 text-muted-foreground/40 line-through cursor-not-allowed border-transparent" :
                            selectedSlot === s.time ? "bg-primary text-primary-foreground border-primary shadow-md" :
                            "border-muted-foreground/20 hover:border-primary hover:bg-primary/5"
                          }`}>
                          {s.time}
                        </button>
                      ))}
                    </div>
                    {slots.filter(s => !s.available).length > 0 && (
                      <p className="text-xs text-muted-foreground">Los horarios tachados ya están ocupados.</p>
                    )}
                  </div>
                )
              )}

              {selectedSlot && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1">
                    <label className="text-sm font-bold">Notas adicionales (opcional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Síntomas, requerimientos especiales..."
                      className="w-full border rounded-xl px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold">Email para recordatorio (opcional)</label>
                    <input type="email" value={reminderEmail} onChange={e => setReminderEmail(e.target.value)} placeholder="correo@ejemplo.com"
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <Button onClick={() => setStep("confirm")} className="w-full">
                    Revisar y Confirmar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP: Confirm */}
          {step === "confirm" && selectedDoctor && (
            <div className="space-y-4">
              <button onClick={() => setStep("datetime")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="w-3.5 h-3.5" /> Volver
              </button>
              <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Confirmar tu cita</h3>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Terapia:</span>
                  <span className="font-bold text-sm">{selectedTherapy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Doctor:</span>
                  <span className="font-bold text-sm">{selectedDoctor.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Especialidad:</span>
                  <span className="text-sm">{selectedDoctor.specialization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fecha:</span>
                  <span className="font-bold text-sm">{selectedDate && format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM yyyy", { locale: es })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Hora:</span>
                  <span className="font-bold text-sm text-primary">{selectedSlot}</span>
                </div>
                {notes && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Notas:</span>
                    <span className="text-sm italic max-w-[60%] text-right">{notes}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={closeDialog}>Cancelar</Button>
                <Button className="flex-1" onClick={handleConfirm} isLoading={createMut.isPending}>
                  <CalendarPlus className="w-4 h-4 mr-1.5" /> Agendar Cita
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
