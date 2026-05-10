import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Perfil from "@/pages/Perfil";
import Tickets from "@/pages/Tickets";
import Despensa from "@/pages/Despensa";
import Recetas from "@/pages/Recetas";
import Suplementos from "@/pages/Suplementos";
import Puntos from "@/pages/Puntos";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/perfil" component={Perfil} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/despensa" component={Despensa} />
      <Route path="/recetas" component={Recetas} />
      <Route path="/suplementos" component={Suplementos} />
      <Route path="/puntos" component={Puntos} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
