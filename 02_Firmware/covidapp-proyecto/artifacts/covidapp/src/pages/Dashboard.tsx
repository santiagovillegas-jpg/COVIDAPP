import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Activity, Users, ArrowRight, Clock } from "lucide-react";
import { useGetAppointments } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useGetAppointments();

  const activeAppts = appointments?.filter(a => a.status === 'pending' || a.status === 'confirmed') || [];
  const nextAppt = activeAppts.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())[0];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 sm:p-10 text-primary-foreground shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display mb-2">
            Hola, {user?.fullName || user?.username}
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-xl">
            Bienvenido al portal de pacientes de COVIDAPP. Aquí puedes gestionar tus terapias y consultar tu historial.
          </p>
        </div>
        <Activity className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow border-t-4 border-t-primary">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Citas Activas</p>
            <h3 className="text-3xl font-black font-display text-foreground">{isLoading ? '-' : activeAppts.length}</h3>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Terapeutas</p>
            <h3 className="text-3xl font-black font-display text-foreground">
              {new Set(appointments?.map(a => a.therapistName).filter(Boolean)).size || 0}
            </h3>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4 hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Próxima Cita</p>
            <h3 className="text-xl font-bold font-display text-foreground mt-1">
              {nextAppt ? format(parseISO(nextAppt.appointmentDate), "dd MMM, HH:mm") : "Ninguna"}
            </h3>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Next Appointment Detailed */}
        <Card className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-primary" /> Tu próxima terapia
            </h2>
          </div>
          
          {nextAppt ? (
            <div className="bg-muted/50 rounded-2xl p-6 border">
              <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full mb-4">
                {nextAppt.therapyType}
              </div>
              <h3 className="text-xl font-bold mb-1">{format(parseISO(nextAppt.appointmentDate), "EEEE, d 'de' MMMM yyyy")}</h3>
              <p className="text-muted-foreground mb-6">Hora: {format(parseISO(nextAppt.appointmentDate), "HH:mm a")}</p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/citas" className="flex-1">
                  <Button className="w-full" variant="outline">Ver todas las citas</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-muted/30 rounded-2xl border border-dashed">
              <p className="text-muted-foreground mb-4">No tienes terapias programadas actualmente.</p>
              <Link href="/citas">
                <Button>Agendar Nueva Cita</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Quick Links */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold font-display mb-6">Accesos Rápidos</h2>
          <div className="space-y-4">
            <Link href="/citas" className="flex items-center justify-between p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">Gestión de Citas</h4>
                  <p className="text-sm text-muted-foreground">Agenda, edita o elimina tus terapias</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>

            <Link href="/galeria" className="flex items-center justify-between p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all group">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">Nuestras Instalaciones</h4>
                  <p className="text-sm text-muted-foreground">Conoce los centros de rehabilitación</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
