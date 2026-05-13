import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Perfil from "@/pages/Perfil";
import Tickets from "@/pages/Tickets";
import Despensa from "@/pages/Despensa";
import Recetas from "@/pages/Recetas";
import Suplementos from "@/pages/Suplementos";
import Puntos from "@/pages/Puntos";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function PublicOnlyRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <PublicOnlyRoute component={Login} />} />
      <Route path="/register" component={() => <PublicOnlyRoute component={Register} />} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/perfil" component={() => <ProtectedRoute component={Perfil} />} />
      <Route path="/tickets" component={() => <ProtectedRoute component={Tickets} />} />
      <Route path="/despensa" component={() => <ProtectedRoute component={Despensa} />} />
      <Route path="/recetas" component={() => <ProtectedRoute component={Recetas} />} />
      <Route path="/suplementos" component={() => <ProtectedRoute component={Suplementos} />} />
      <Route path="/puntos" component={() => <ProtectedRoute component={Puntos} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
