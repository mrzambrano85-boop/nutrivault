import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, BookOpen, Pill, Trophy } from "lucide-react";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [nombre, setNombre] = useState("Usuario");
  const [stats, setStats] = useState({ despensa: 0, recetas: 0, suplementos: 0, puntos: 0 });

  useEffect(() => {
    if (!supabase || !user) return;

    async function loadData() {
      try {
        const { data: perfil } = await supabase!
          .from("usuarios")
          .select("nombre")
          .eq("id", user!.id)
          .single();
        if (perfil?.nombre) setNombre(perfil.nombre);
        else if (user!.email) setNombre(user!.email.split("@")[0]);
      } catch {
        if (user!.email) setNombre(user!.email.split("@")[0]);
      }

      try {
        const [despensaRes, recetasRes, suplementosRes, puntosRes] = await Promise.all([
          supabase!.from("ingredientes").select("*", { count: "exact", head: true }).eq("usuario_id", user!.id),
          supabase!.from("recetas").select("*", { count: "exact", head: true }),
          supabase!.from("suplementos").select("*", { count: "exact", head: true }).eq("activo", true).eq("usuario_id", user!.id),
          supabase!.from("vista_puntos_totales").select("*").eq("usuario_id", user!.id),
        ]);

        const viewRow = puntosRes.data?.[0];
        const totalPuntos = viewRow?.total_puntos ?? viewRow?.total ?? viewRow?.puntos ?? 0;

        setStats({
          despensa: despensaRes.count || 0,
          recetas: recetasRes.count || 0,
          suplementos: suplementosRes.count || 0,
          puntos: totalPuntos,
        });
      } catch {
        // keep zeros
      }
    }

    loadData();
  }, [user]);

  const dateLocale = lang === "en" ? enUS : es;
  const datePattern = lang === "en" ? "EEEE, MMMM d" : "EEEE, d 'de' MMMM";
  const today = format(new Date(), datePattern, { locale: dateLocale });

  return (
    <Layout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground capitalize" data-testid="dashboard-welcome">
            {t("dash.greeting", { name: nombre })}
          </h1>
          <p className="text-muted-foreground mt-1 capitalize" data-testid="dashboard-date">
            {today}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats">
          <StatCard title={t("dash.stat_despensa")} value={stats.despensa} icon={ShoppingBasket} testId="stat-despensa" />
          <StatCard title={t("dash.stat_recetas")} value={stats.recetas} icon={BookOpen} testId="stat-recetas" />
          <StatCard title={t("dash.stat_suplementos")} value={stats.suplementos} icon={Pill} testId="stat-suplementos" />
          <StatCard title={t("dash.stat_puntos")} value={stats.puntos} icon={Trophy} testId="stat-puntos" />
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, testId }: {
  title: string; value: number; icon: React.ElementType; testId: string;
}) {
  return (
    <Card className="transition-all duration-200 border-border/50 hover:shadow-md" data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
