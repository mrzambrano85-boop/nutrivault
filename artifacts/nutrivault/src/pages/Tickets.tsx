import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Ticket as TicketIcon } from "lucide-react";

export default function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return; }
    async function load() {
      try {
        const { data } = await supabase!
          .from("tickets")
          .select("*")
          .eq("usuario_id", user!.id)
          .order("created_at", { ascending: false });
        if (data) setTickets(data);
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tickets</h1>
            <p className="text-muted-foreground mt-1">Soporte y actividad de tu cuenta.</p>
          </div>
          <Button data-testid="button-new-ticket">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Ticket
          </Button>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted rounded-t-lg" />
              </Card>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <TicketIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">No hay tickets</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">No has abierto ningún ticket de soporte o actividad reciente.</p>
              <Button variant="outline" className="mt-6" data-testid="button-create-first-ticket">Crear el primero</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} data-testid={`card-ticket-${ticket.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{ticket.titulo || ticket.title}</CardTitle>
                      <CardDescription>{new Date(ticket.created_at).toLocaleDateString("es-ES")}</CardDescription>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {ticket.estado || ticket.status || "Abierto"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{ticket.descripcion || ticket.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
