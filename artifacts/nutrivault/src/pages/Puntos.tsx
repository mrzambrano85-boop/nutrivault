import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, TrendingUp } from "lucide-react";

export default function Puntos() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [historial, setHistorial] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return; }
    async function load() {
      try {
        const [histRes, totalRes] = await Promise.all([
          supabase!.from("puntos").select("*").eq("usuario_id", user!.id).order("created_at", { ascending: false }),
          supabase!.from("vista_puntos_totales").select("puntos_totales").eq("user_id", user!.id),
        ]);
        if (histRes.data) setHistorial(histRes.data);
        const row = totalRes.data?.[0];
        setTotal(row?.puntos_totales ?? histRes.data?.reduce((a, c) => a + (c.cantidad || 0), 0) ?? 0);
      } catch { /* empty */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const nivelLabel =
    total >= 5000 ? t("pts.experto") :
    total >= 1000 ? t("pts.avanzado") :
    t("pts.entusiasta");

  return (
    <Layout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">{t("pts.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("pts.subtitle")}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className="md:col-span-2 border-primary/20"
            style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.1),rgba(34,197,94,0.05))" }}
          >
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">{t("pts.balance")}</p>
                <div className="text-5xl font-bold mt-2 flex items-baseline gap-2 text-foreground">
                  {total}{" "}
                  <span className="text-xl text-muted-foreground font-normal">{t("pts.pts")}</span>
                </div>
              </div>
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" /> {t("pts.nivel")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{nivelLabel}</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("pts.progreso")}</span>
                  <span>{total} / 1000</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (total / 1000) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("pts.historial")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map((i) => <div key={i} className="animate-pulse h-12 bg-muted rounded-md" />)}
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto opacity-20 mb-4" />
                <p>{t("pts.empty")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historial.map((e) => (
                  <div key={e.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{e.concepto || t("pts.recompensa")}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(e.created_at).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-lg text-primary">+{e.cantidad}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
