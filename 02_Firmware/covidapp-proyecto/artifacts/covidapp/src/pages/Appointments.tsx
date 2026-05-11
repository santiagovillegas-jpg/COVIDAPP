import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetAppointments, 
  useCreateAppointment, 
  useUpdateAppointment, 
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CalendarPlus, Mail, Edit2, Trash2, CalendarDays, User as UserIcon, Clock } from "lucide-react";
import { toLocalDatetime } from "@/lib/utils";

const appointmentSchema = z.object({
  therapyType: z.string().min(1, "Selecciona un tipo de terapia"),
  therapistName: z.string().optional(),
  appointmentDate: z.string().min(1, "La fecha es requerida"),
  reminderEmail: z.string().email("Email inválido").or(z.literal('')).optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional()
});

type ApptForm = z.infer<typeof appointmentSchema>;

const THERAPY_TYPES = [
  "Terapia Física",
  "Terapia del Habla",
  "Terapia Ocupacional",
  "Terapia Cognitiva",
  "Psicología"
];

export default function Appointments() {
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useGetAppointments();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ApptForm>({
    resolver: zodResolver(appointmentSchema)
  });

  const createMut = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cita creada", variant: "success" });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        setDialogOpen(false);
      }
    }
  });

  const updateMut = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cita actualizada", variant: "success" });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        setDialogOpen(false);
      }
    }
  });

  const deleteMut = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cita eliminada", variant: "default" });
        queryClient.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
      }
    }
  });

  const reminderMut = useSendAppointmentReminder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Recordatorio enviado", description: "El correo ha sido programado.", variant: "success" });
      },
      onError: () => {
        toast({ title: "Error", description: "No se pudo enviar el correo. Verifique la dirección.", variant: "destructive" });
      }
    }
  });

  const openCreate = () => {
    setEditingAppt(null);
    reset({
      therapyType: "",
      therapistName: "",
      appointmentDate: "",
      reminderEmail: "",
      notes: "",
      status: "pending"
    });
    setDialogOpen(true);
  };

  const openEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    reset({
      therapyType: appt.therapyType,
      therapistName: appt.therapistName || "",
      appointmentDate: toLocalDatetime(appt.appointmentDate),
      reminderEmail: appt.reminderEmail || "",
      notes: appt.notes || "",
      status: appt.status as any
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ApptForm) => {
    const payload = {
      ...data,
      appointmentDate: new Date(data.appointmentDate).toISOString(),
    };
    
    if (editingAppt) {
      updateMut.mutate({ id: editingAppt.id, data: payload });
    } else {
      createMut.mutate({ data: payload });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta cita?")) {
      deleteMut.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="warning">Pendiente</Badge>;
      case 'confirmed': return <Badge variant="success">Confirmada</Badge>;
      case 'completed': return <Badge variant="default">Completada</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

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
          {[1,2,3].map(i => <Card key={i} className="h-64 animate-pulse bg-muted/50" />)}
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
                    <div className="p-3 bg-muted rounded-lg mt-4 text-xs italic">
                      "{appt.notes}"
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-muted/30 border-t p-4 flex items-center justify-between gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-xs"
                  onClick={() => reminderMut.mutate({ id: appt.id })}
                  isLoading={reminderMut.isPending && reminderMut.variables?.id === appt.id}
                >
                  <Mail className="w-4 h-4 mr-1.5" /> Recordar
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(appt)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(appt.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        title={editingAppt ? "Editar Cita" : "Nueva Cita"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-foreground">Tipo de Terapia *</label>
            <Select {...register("therapyType")} error={!!errors.therapyType}>
              <option value="">Seleccione...</option>
              {THERAPY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            {errors.therapyType && <p className="text-xs text-destructive">{errors.therapyType.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-foreground">Fecha y Hora *</label>
            <Input type="datetime-local" {...register("appointmentDate")} error={!!errors.appointmentDate} />
            {errors.appointmentDate && <p className="text-xs text-destructive">{errors.appointmentDate.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-foreground">Nombre del Terapeuta</label>
            <Input {...register("therapistName")} placeholder="Opcional" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-foreground">Email para recordatorios</label>
            <Input type="email" {...register("reminderEmail")} placeholder="correo@ejemplo.com" error={!!errors.reminderEmail} />
            {errors.reminderEmail && <p className="text-xs text-destructive">{errors.reminderEmail.message}</p>}
          </div>

          {editingAppt && (
            <div className="space-y-1">
              <label className="text-sm font-bold text-foreground">Estado</label>
              <Select {...register("status")}>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-bold text-foreground">Notas Adicionales</label>
            <Textarea {...register("notes")} placeholder="Síntomas, requerimientos especiales..." />
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" isLoading={createMut.isPending || updateMut.isPending}>
              Guardar Cita
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
