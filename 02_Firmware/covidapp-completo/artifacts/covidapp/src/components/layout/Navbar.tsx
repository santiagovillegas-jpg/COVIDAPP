import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, Menu, UserCircle, LogOut, X } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  useGetNotifications,
  useLogoutUser,
  useMarkNotificationRead,
  getGetNotificationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";

export function Navbar() {
  const { user, isAuthenticated, isSuperAdmin, isTherapist, isNonMedicalAdmin, isPatient } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [infoDialog, setInfoDialog] = useState({ open: false, title: "", content: "" });

  const qc = useQueryClient();
  const logoutMutation = useLogoutUser({
    mutation: { onSuccess: () => { window.location.href = import.meta.env.BASE_URL; } }
  });

  const { data: notifications } = useGetNotifications({
    query: { refetchInterval: 30000, enabled: isAuthenticated }
  });
  const markReadMutation = useMarkNotificationRead({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }) }
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const showInfo = (title: string, content: string) => setInfoDialog({ open: true, title, content });

  const NavItem = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="relative group">
      <button className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors py-2 text-sm">
        {title} <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
      </button>
      <div className="absolute top-full left-0 mt-2 w-56 bg-card shadow-xl rounded-2xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
        <div className="py-2 flex flex-col">{children}</div>
      </div>
    </div>
  );

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className="px-4 py-2.5 hover:bg-muted text-sm font-medium transition-colors block">{children}</Link>
  );

  const homeHref = isSuperAdmin ? "/admin" : isTherapist ? "/terapeuta" : isNonMedicalAdmin ? "/admininfo" : "/bienvenida";

  return (
    <>
      <header className="bg-background/90 backdrop-blur-xl border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <Link href={isAuthenticated ? homeHref : "/"} className="flex items-center gap-2 flex-shrink-0">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="COVIDAPP" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold font-display text-primary tracking-tight">COVIDAPP</span>
          </Link>

          {isAuthenticated && (
            <>
              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-4 flex-1">

                {/* Paciente */}
                {isPatient && <>
                  <NavItem title="Mi Portal">
                    <NavLink href="/bienvenida">Panel Principal</NavLink>
                    <NavLink href="/citas">Mis Citas</NavLink>
                    <NavLink href="/tareas">Mis Tareas</NavLink>
                    <NavLink href="/medicamentos">Mis Medicamentos</NavLink>
                    <NavLink href="/historial">Historial Médico</NavLink>
                    <NavLink href="/archivos">Mis Archivos</NavLink>
                    <NavLink href="/material">Material de Trabajo</NavLink>
                    <NavLink href="/telemedicina">Telemedicina</NavLink>
                  </NavItem>
                  <NavItem title="Recursos">
                    <NavLink href="/recursos">Centros Médicos</NavLink>
                    <NavLink href="/galeria">Galería de Instalaciones</NavLink>
                  </NavItem>
                  <NavItem title="Quiénes Somos">
                    <button onClick={() => showInfo("Misión", "Proveer servicios de rehabilitación integral con la más alta calidad y calidez humana, facilitando la reintegración social y mejorando la calidad de vida de nuestros pacientes en Armenia, Colombia.")}
                      className="px-4 py-2.5 hover:bg-muted text-left text-sm font-medium transition-colors w-full">Misión</button>
                    <button onClick={() => showInfo("Visión", "Ser la fundación líder en el Eje Cafetero en innovación y terapias de rehabilitación, reconocidos por nuestro impacto positivo y compromiso social.")}
                      className="px-4 py-2.5 hover:bg-muted text-left text-sm font-medium transition-colors w-full">Visión</button>
                  </NavItem>
                  <NavItem title="Soporte">
                    <a href="mailto:contacto@covida.edu.co" className="px-4 py-2.5 hover:bg-muted text-sm font-medium block">✉️ contacto@covida.edu.co</a>
                    <a href="tel:+573011234567" className="px-4 py-2.5 hover:bg-muted text-sm font-medium block">📞 +57 301 123 4567</a>
                  </NavItem>
                </>}

                {/* Terapeuta */}
                {isTherapist && <>
                  <Link href="/terapeuta" className="text-sm font-semibold hover:text-primary">Panel Terapéutico</Link>
                  <NavLink href="/recursos">Recursos Médicos</NavLink>
                  <NavLink href="/telemedicina">Telemedicina 🎥</NavLink>
                </>}

                {/* Admin no médico */}
                {isNonMedicalAdmin && <>
                  <Link href="/admininfo" className="text-sm font-semibold hover:text-primary">Estadísticas</Link>
                  <NavLink href="/recursos">Recursos Médicos</NavLink>
                </>}

                {/* Superadmin */}
                {isSuperAdmin && <>
                  <NavItem title="Administración">
                    <NavLink href="/admin">Panel Principal</NavLink>
                    <NavLink href="/personal">Gestión de Personal</NavLink>
                    <NavLink href="/recursos">Recursos Médicos</NavLink>
                    <NavLink href="/terapeuta">Vista Terapeuta</NavLink>
                    <NavLink href="/admininfo">Vista Admin No Médico</NavLink>
                  </NavItem>
                  <NavLink href="/telemedicina">Telemedicina 🎥</NavLink>
                </>}
              </nav>

              <div className="flex items-center gap-3">
                {/* Notificaciones */}
                <div className="relative">
                  <button onClick={() => setNotifOpen(!notifOpen)}
                    className="p-2 rounded-full hover:bg-muted transition-colors relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
                    )}
                  </button>

                  {notifOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                      <div className="absolute top-full right-0 mt-2 w-80 bg-card shadow-2xl rounded-2xl border z-50 overflow-hidden">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                          <h3 className="font-bold text-sm">Notificaciones {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">{unreadCount}</span>}</h3>
                          <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                          {!notifications?.length ? (
                            <p className="text-sm text-center text-muted-foreground py-6">Sin notificaciones</p>
                          ) : notifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-xl text-sm ${n.read ? "opacity-50 bg-transparent" : "bg-primary/5 border border-primary/10"}`}>
                              <h4 className="font-bold text-xs">{n.title}</h4>
                              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{n.message}</p>
                              {!n.read && (
                                <button onClick={() => markReadMutation.mutate({ id: n.id })}
                                  className="text-primary text-xs font-bold hover:underline mt-1 block">
                                  Marcar como leída
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* User menu */}
                <div className="relative group hidden sm:block">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border hover:bg-muted transition-colors">
                    <span className="text-sm font-bold max-w-[100px] truncate">{user?.username}</span>
                    <UserCircle className="w-7 h-7 text-primary" />
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-52 bg-card shadow-xl rounded-2xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                    <div className="p-4 border-b">
                      <p className="font-bold text-sm truncate">{user?.fullName || user?.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      <Link href="/perfil" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                        <UserCircle className="w-4 h-4" /> Mi Perfil
                      </Link>
                      <button onClick={() => logoutMutation.mutate()}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>

                <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Mobile menu */}
        {isAuthenticated && mobileOpen && (
          <div className="lg:hidden border-t bg-card p-4 space-y-2 z-30">
            {isPatient && <>
              <MobileLink href="/bienvenida" onClick={() => setMobileOpen(false)}>🏠 Panel Principal</MobileLink>
              <MobileLink href="/citas" onClick={() => setMobileOpen(false)}>📅 Mis Citas</MobileLink>
              <MobileLink href="/tareas" onClick={() => setMobileOpen(false)}>📋 Mis Tareas</MobileLink>
              <MobileLink href="/medicamentos" onClick={() => setMobileOpen(false)}>💊 Mis Medicamentos</MobileLink>
              <MobileLink href="/historial" onClick={() => setMobileOpen(false)}>🩺 Historial Médico</MobileLink>
              <MobileLink href="/archivos" onClick={() => setMobileOpen(false)}>Mis Archivos</MobileLink>
              <MobileLink href="/material" onClick={() => setMobileOpen(false)}>Material de Trabajo</MobileLink>
              <MobileLink href="/telemedicina" onClick={() => setMobileOpen(false)}>Telemedicina</MobileLink>
              <MobileLink href="/recursos" onClick={() => setMobileOpen(false)}>Centros Medicos</MobileLink>
            </>}
            {isTherapist && <>
              <MobileLink href="/terapeuta" onClick={() => setMobileOpen(false)}>🩺 Panel Terapéutico</MobileLink>
              <MobileLink href="/recursos" onClick={() => setMobileOpen(false)}>🏥 Recursos</MobileLink>
              <MobileLink href="/telemedicina" onClick={() => setMobileOpen(false)}>🎥 Telemedicina</MobileLink>
            </>}
            {isNonMedicalAdmin && <>
              <MobileLink href="/admininfo" onClick={() => setMobileOpen(false)}>📊 Estadísticas</MobileLink>
              <MobileLink href="/recursos" onClick={() => setMobileOpen(false)}>🏥 Recursos</MobileLink>
            </>}
            {isSuperAdmin && <>
              <MobileLink href="/admin" onClick={() => setMobileOpen(false)}>🛡️ Panel Admin</MobileLink>
              <MobileLink href="/personal" onClick={() => setMobileOpen(false)}>👥 Personal</MobileLink>
              <MobileLink href="/recursos" onClick={() => setMobileOpen(false)}>🏥 Recursos</MobileLink>
              <MobileLink href="/telemedicina" onClick={() => setMobileOpen(false)}>🎥 Telemedicina</MobileLink>
            </>}
            <MobileLink href="/perfil" onClick={() => setMobileOpen(false)}>👤 Mi Perfil</MobileLink>
            <button onClick={() => logoutMutation.mutate()}
              className="w-full text-left px-4 py-2.5 text-destructive font-bold rounded-xl hover:bg-destructive/10">
              <LogOut className="w-4 h-4 inline mr-2" />Cerrar Sesión
            </button>
          </div>
        )}
      </header>

      <Dialog open={infoDialog.open} onOpenChange={o => setInfoDialog(d => ({ ...d, open: o }))} title={infoDialog.title}>
        <p className="text-lg leading-relaxed text-muted-foreground">{infoDialog.content}</p>
        <div className="mt-8 flex justify-end">
          <Button onClick={() => setInfoDialog(d => ({ ...d, open: false }))}>Entendido</Button>
        </div>
      </Dialog>
    </>
  );
}

function MobileLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick}
      className="block px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-primary/5 py-8 border-t border-primary/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 text-sm text-primary font-medium flex-wrap">
          <span>Armenia, Colombia</span>
          <span className="hidden sm:inline text-muted-foreground">|</span>
          <a href="tel:+573011234567" className="hover:underline">+57 301 123 4567</a>
          <span className="hidden sm:inline text-muted-foreground">|</span>
          <a href="mailto:contacto@covida.edu.co" className="hover:underline">contacto@covida.edu.co</a>
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">
          ©️ 2025 Universidad del Quindío | Alpha build v0.0.1
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        {children}
      </main>
      <Footer />
    </div>
  );
}
