import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/Navbar";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Appointments from "@/pages/Appointments";
import Gallery from "@/pages/Gallery";
import HistorialMedico from "@/pages/HistorialMedico";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import TherapistDashboard from "@/pages/TherapistDashboard";
import NonMedicalAdminDashboard from "@/pages/NonMedicalAdminDashboard";
import Profile from "@/pages/Profile";
import Resources from "@/pages/Resources";
import Tasks from "@/pages/Tasks";
import Medications from "@/pages/Medications";
import PatientFiles from "@/pages/PatientFiles";
import Telemedicine from "@/pages/Telemedicine";
import WorkMaterials from "@/pages/WorkMaterials";
import StaffRegister from "@/pages/StaffRegister";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function roleHome(role: string) {
  switch (role) {
    case "superadmin": return "/admin";
    case "therapist": return "/terapeuta";
    case "nonmedical_admin": return "/admininfo";
    default: return "/bienvenida";
  }
}

function ProtectedRoute({ component: Component, allowRoles }: { component: any; allowRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <Layout>
      <div className="flex h-[60vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (!user) return <Redirect to="/" />;
  if (allowRoles && !allowRoles.includes(user.role)) return <Redirect to={roleHome(user.role)} />;

  return <Layout><Component /></Layout>;
}

function Router() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  const home = user ? roleHome(user.role) : "/";

  return (
    <Switch>
      {/* Public */}
      <Route path="/">{user ? <Redirect to={home} /> : <Login />}</Route>
      <Route path="/registro">{user ? <Redirect to={home} /> : <Register />}</Route>
      <Route path="/admin/login">{user ? <Redirect to={home} /> : <AdminLogin />}</Route>

      {/* Superadmin */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} allowRoles={["superadmin"]} />
      </Route>
      <Route path="/personal">
        <ProtectedRoute component={StaffRegister} allowRoles={["superadmin"]} />
      </Route>

      {/* Terapeuta */}
      <Route path="/terapeuta">
        <ProtectedRoute component={TherapistDashboard} allowRoles={["therapist", "superadmin"]} />
      </Route>

      {/* Admin no médico */}
      <Route path="/admininfo">
        <ProtectedRoute component={NonMedicalAdminDashboard} allowRoles={["nonmedical_admin", "superadmin"]} />
      </Route>

      {/* Paciente */}
      <Route path="/bienvenida">
        <ProtectedRoute component={Dashboard} allowRoles={["patient"]} />
      </Route>
      <Route path="/citas">
        <ProtectedRoute component={Appointments} allowRoles={["patient"]} />
      </Route>
      <Route path="/tareas">
        <ProtectedRoute component={Tasks} allowRoles={["patient"]} />
      </Route>
      <Route path="/medicamentos">
        <ProtectedRoute component={Medications} allowRoles={["patient"]} />
      </Route>
      <Route path="/historial">
        <ProtectedRoute component={HistorialMedico} allowRoles={["patient"]} />
      </Route>
      <Route path="/archivos">
        <ProtectedRoute component={PatientFiles} allowRoles={["patient"]} />
      </Route>
      <Route path="/galeria">
        <ProtectedRoute component={Gallery} />
      </Route>

      {/* Shared */}
      <Route path="/perfil">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/recursos">
        <ProtectedRoute component={Resources} />
      </Route>
      <Route path="/telemedicina">
        <ProtectedRoute component={Telemedicine} />
      </Route>
      <Route path="/material">
        <ProtectedRoute component={WorkMaterials} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
