import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, Menu, UserCircle, LogOut } from "lucide-react";
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
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogContent, setInfoDialogContent] = useState({ title: "", content: "" });
  
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutUser({
    mutation: {
      onSuccess: () => {
        window.location.href = import.meta.env.BASE_URL;
      }
    }
  });

  const { data: notifications } = useGetNotifications({
    query: { refetchInterval: 30000, enabled: isAuthenticated }
  });
  
  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
      }
    }
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const showInfo = (title: string, content: string) => {
    setInfoDialogContent({ title, content });
    setInfoDialogOpen(true);
  };

  const NavItem = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="relative group">
      <button className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors py-2">
        {title} <ChevronDown className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" />
      </button>
      <div className="absolute top-full left-0 mt-2 w-56 bg-card shadow-xl rounded-2xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
        <div className="py-2 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="bg-background/80 backdrop-blur-xl border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href={isAuthenticated ? "/bienvenida" : "/"} className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="COVIDAPP Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold font-display text-primary tracking-tight">COVIDAPP</span>
          </Link>

          {isAuthenticated && (
            <>
              <nav className="hidden md:flex items-center gap-8">
                <NavItem title="Inicio">
                  <Link href="/galeria" className="px-4 py-2 hover:bg-muted text-sm font-medium transition-colors">Galería de Instalaciones</Link>
                  <Link href="/bienvenida" className="px-4 py-2 hover:bg-muted text-sm font-medium transition-colors">Panel Principal</Link>
                </NavItem>
                
                <NavItem title="Quiénes somos">
                  <button 
                    onClick={() => showInfo("Nuestra Misión", "Proveer servicios de rehabilitación integral con la más alta calidad y calidez humana, facilitando la reintegración social y mejorando la calidad de vida de nuestros pacientes en Armenia, Colombia.")}
                    className="px-4 py-2 hover:bg-muted text-left text-sm font-medium transition-colors"
                  >
                    Misión
                  </button>
                  <button 
                    onClick={() => showInfo("Nuestra Visión", "Ser la fundación líder en el Eje Cafetero en innovación y terapias de rehabilitación, reconocidos por nuestro impacto positivo y compromiso social.")}
                    className="px-4 py-2 hover:bg-muted text-left text-sm font-medium transition-colors"
                  >
                    Visión
                  </button>
                </NavItem>

                <NavItem title="Historial médico">
                  <button onClick={() => toast({title: "Historial Médico", description: "Módulo en construcción."})} className="px-4 py-2 hover:bg-muted text-left text-sm font-medium">Ver Historial</button>
                  <button onClick={() => toast({title: "Editar Historial", description: "Módulo en construcción."})} className="px-4 py-2 hover:bg-muted text-left text-sm font-medium">Actualizar Datos</button>
                </NavItem>

                <NavItem title="Lugares de apoyo">
                  <button onClick={() => toast({title: "Mapa", description: "Cargando mapa de centros de apoyo en Armenia..."})} className="px-4 py-2 hover:bg-muted text-left text-sm font-medium">Mapa</button>
                  <button onClick={() => toast({title: "Centros Cercanos", description: "Buscando centros de rehabilitación cercanos..."})} className="px-4 py-2 hover:bg-muted text-left text-sm font-medium">Centros Cercanos</button>
                </NavItem>

                <NavItem title="Soporte y Contacto">
                  <div className="px-4 pt-2 pb-1 text-xs font-bold text-muted-foreground uppercase tracking-widest">Contactos</div>
                  <a href="mailto:contacto@covida.edu.co" className="px-4 py-2 hover:bg-muted text-sm font-medium flex items-center gap-2 transition-colors">
                    ✉️ contacto@covida.edu.co
                  </a>
                  <a href="mailto:soporte@covida.edu.co" className="px-4 py-2 hover:bg-muted text-sm font-medium flex items-center gap-2 transition-colors">
                    ✉️ soporte@covida.edu.co
                  </a>
                  <div className="mx-3 my-1 border-t border-border" />
                  <a href="tel:+573011234567" className="px-4 py-2 hover:bg-muted text-sm font-medium flex items-center gap-2 transition-colors">
                    📞 +57 301 123 4567
                  </a>
                  <a href="tel:+573029876543" className="px-4 py-2 hover:bg-muted text-sm font-medium flex items-center gap-2 transition-colors">
                    📞 +57 302 987 6543
                  </a>
                </NavItem>
              </nav>

              <div className="flex items-center gap-4">
                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 rounded-full hover:bg-muted text-foreground transition-colors relative"
                  >
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background animate-pulse" />
                    )}
                  </button>
                  
                  {notificationsOpen && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-card shadow-2xl rounded-2xl border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95">
                      <div className="p-4 border-b bg-muted/30">
                        <h3 className="font-bold">Notificaciones ({unreadCount})</h3>
                      </div>
                      <div className="max-h-80 overflow-y-auto p-2 flex flex-col gap-2">
                        {notifications?.length === 0 ? (
                          <p className="text-sm text-center text-muted-foreground p-4">No hay notificaciones</p>
                        ) : (
                          notifications?.map(n => (
                            <div key={n.id} className={`p-3 rounded-xl text-sm ${n.read ? 'opacity-60 bg-transparent' : 'bg-primary/5 border border-primary/10'}`}>
                              <h4 className="font-bold mb-1">{n.title}</h4>
                              <p className="text-muted-foreground mb-2 text-xs">{n.message}</p>
                              {!n.read && (
                                <button 
                                  onClick={() => markReadMutation.mutate({ id: n.id })}
                                  className="text-primary text-xs font-bold hover:underline"
                                >
                                  Marcar como leída
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User dropdown */}
                <div className="relative group hidden sm:block">
                  <button className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-full bg-muted/50 border hover:bg-muted transition-colors">
                    <span className="text-sm font-bold max-w-[100px] truncate">{user?.username}</span>
                    <UserCircle className="w-8 h-8 text-primary" />
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-card shadow-xl rounded-2xl border border-border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                    <div className="p-4 border-b">
                      <p className="font-bold text-sm truncate">{user?.fullName || user?.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => logoutMutation.mutate()}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>

                <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen} title={infoDialogContent.title}>
        <p className="text-lg leading-relaxed text-muted-foreground">
          {infoDialogContent.content}
        </p>
        <div className="mt-8 flex justify-end">
          <Button onClick={() => setInfoDialogOpen(false)}>Entendido</Button>
        </div>
      </Dialog>
    </>
  );
}

export function Footer() {
  return (
    <footer className="bg-primary/5 py-8 border-t border-primary/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 text-sm text-primary font-medium flex-wrap">
          <a href="#" className="hover:underline">Dirección</a>
          <span className="hidden sm:inline text-muted-foreground">|</span>
          <a href="tel:+573011234567" className="hover:underline">+57 301 123 4567</a>
          <span className="hidden sm:inline text-muted-foreground">|</span>
          <a href="#" className="hover:underline">Guía de ayuda a discapacitados</a>
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
