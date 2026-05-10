import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, BookOpen, Pill, Trophy } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
  const [username, setUsername] = useState("Usuario");
  const [stats, setStats] = useState({
    despensa: 0,
    recetas: 0,
    suplementos: 0,
    puntos: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!supabase) return;

      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          const name = authData.user.user_metadata?.name || authData.user.email.split("@")[0];
          setUsername(name);
        }
      } catch {
        // ignore auth errors
      }

      try {
        const [despensaRes, recetasRes, suplementosRes, puntosRes] = await Promise.all([
          supabase.from("ingredientes").select("*", { count: "exact", head: true }),
          supabase.from("recetas").select("*", { count: "exact", head: true }),
          supabase.from("suplementos").select("*", { count: "exact", head: true }).eq("activo", true),
          supabase.from("vista_puntos_totales").select("*"),
        ]);

        const totalPuntos =
          puntosRes.data?.[0]?.total_puntos ??
          puntosRes.data?.[0]?.total ??
          puntosRes.data?.[0]?.puntos ??
          puntosRes.data?.reduce((acc: number, curr: any) => acc + (curr.puntos || curr.points || 0), 0) ??
          0;

        setStats({
          despensa: despensaRes.count || 0,
          recetas: recetasRes.count || 0,
          suplementos: suplementosRes.count || 0,
          puntos: totalPuntos,
        });
      } catch {
        // show zeros on error
      }
    }

    loadData();
  }, []);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <Layout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground capitalize" data-testid="dashboard-welcome">
            Hola, {username}
          </h1>
          <p className="text-muted-foreground mt-1 capitalize" data-testid="dashboard-date">
            {today}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats">
          <StatCard title="Ingredientes en despensa" value={stats.despensa} icon={ShoppingBasket} testId="stat-despensa" />
          <StatCard title="Recetas disponibles" value={stats.recetas} icon={BookOpen} testId="stat-recetas" />
          <StatCard title="Suplementos activos" value={stats.suplementos} icon={Pill} testId="stat-suplementos" />
          <StatCard title="Puntos totales" value={stats.puntos} icon={Trophy} testId="stat-puntos" />
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  testId,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  testId: string;
}) {
  return (
    <Card className="hover-elevate transition-all duration-200 border-border/50" data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
