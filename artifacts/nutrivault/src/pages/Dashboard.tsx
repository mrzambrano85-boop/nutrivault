import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { usePlan } from "@/context/PlanContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, BookOpen, Pill, Trophy, ChevronRight, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";

const NAV_MAP = {
  despensa:    "/despensa",
  recetas:     "/recetas",
  suplementos: "/suplementos",
  puntos:      "/puntos",
} as const;

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { isTrialActive, trialDaysLeft } = usePlan();
  const [, navigate] = useLocation();
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
          despensa:    despensaRes.count || 0,
          recetas:     recetasRes.count || 0,
          suplementos: suplementosRes.count || 0,
          puntos:      totalPuntos,
        });
      } catch {
        // keep zeros
      }
    }
    loadData();
  }, [user]);

  const dateLocale  = lang === "en" ? enUS : es;
  const datePattern = lang === "en" ? "EEEE, MMMM d" : "EEEE, d 'de' MMMM";
  const today       = format(new Date(), datePattern, { locale: dateLocale });

  const bannerUrgent  = trialDaysLeft <= 3;
  const bannerWarning = trialDaysLeft <= 7 && trialDaysLeft > 3;

  return (
    <Layout>
      <div className="space-y-6">

        {/* Banner Trial */}
        {isTrialActive && (
          <div className={`
            rounded-xl px-4 py-3 flex items-center justify-between gap-4 border
            ${bannerUrgent
              ? "bg-red-50 border-red-200"
              : bannerWarning
              ? "bg-amber-50 border-amber-200"
              : "bg-primary/5 border-primary/20"}
          `}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center shrink-0
                ${bannerUrgent ? "bg-red-100" : bannerWarning ? "bg-amber-100" : "bg-primary/10"}
              `}>
                <Clock className={`h-4 w-4 ${bannerUrgent ? "text-red-500" : bannerWarning ? "text-amber-500" : "text-primary"}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${bannerUrgent ? "text-red-700" : bannerWarning ? "text-amber-700" : "text-primary"}`}>
                  {trialDaysLeft === 1
                    ? "¡Tu prueba gratuita termina mañana!"
                    : `Te quedan ${trialDaysLeft} días de prueba gratuita`}
                </p>
                <p className={`text-xs mt-0.5 ${bannerUrgent ? "text-red-500" : bannerWarning ? "text-amber-500" : "text-muted-foreground"}`}>
                  {bannerUrgent
                    ? "Activa tu plan para no perder el acceso"
                    : "Después del trial necesitas un plan para continuar"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className={`shrink-0 gap-1.5 ${bannerUrgent ? "bg-red-600 hover:bg-red-700" : bannerWarning ? "bg-amber-500 hover:bg-amber-600" : ""}`}
              onClick={() => window.location.href = "/api/create-checkout-session"}
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Activar plan</span>
              <span className="sm:hidden">$9.99</span>
            </Button>
          </div>
        )}

        <header>
          <h1
            className="text-3xl font-bold text-foreground capitalize"
            data-testid="dashboard-welcome"
          >
            {t("dash.greeting", { name: nombre })}
          </h1>
          <p className="text-muted-foreground mt-1 capitalize" data-testid="dashboard-date">
            {today}
          </p>
        </header>

        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="dashboard-stats"
        >
          <StatCard
            title={t("dash.stat_despensa")}
            value={stats.despensa}
            icon={ShoppingBasket}
            testId="stat-despensa"
            onClick={() => navigate(NAV_MAP.despensa)}
          />
          <StatCard
            title={t("dash.stat_recetas")}
            value={stats.recetas}
            icon={BookOpen}
            testId="stat-recetas"
            onClick={() => navigate(NAV_MAP.recetas)}
          />
          <StatCard
            title={t("dash.stat_suplementos")}
            value={stats.suplementos}
            icon={Pill}
            testId="stat-suplementos"
            onClick={() => navigate(NAV_MAP.suplementos)}
          />
          <StatCard
            title={t("dash.stat_puntos")}
            value={stats.puntos}
            icon={Trophy}
            testId="stat-puntos"
            onClick={() => navigate(NAV_MAP.puntos)}
          />
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
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  testId: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="
        transition-all duration-200 border-border/50
        hover:shadow-md hover:border-primary/30
        cursor-pointer active:scale-95
        touch-manipulation select-none
      "
      data-testid={testId}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground leading-tight">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 mb-1" />
      </CardContent>
    </Card>
  );
}