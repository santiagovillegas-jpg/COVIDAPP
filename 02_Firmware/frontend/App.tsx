import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/Navbar";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Appointments from "@/pages/Appointments";
import Gallery from "@/pages/Gallery";

const queryClient = new QueryClient();

// High Order Component for Protected Routes
function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return <Redirect to="/" />;
  }
  
  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Switch>
      {/* Public Auth Routes */}
      <Route path="/">
        {user ? <Redirect to="/bienvenida" /> : <Login />}
      </Route>
      <Route path="/registro">
        {user ? <Redirect to="/bienvenida" /> : <Register />}
      </Route>

      {/* Protected App Routes */}
      <Route path="/bienvenida">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/citas">
        <ProtectedRoute component={Appointments} />
      </Route>
      <Route path="/galeria">
        <ProtectedRoute component={Gallery} />
      </Route>

      {/* 404 */}
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
