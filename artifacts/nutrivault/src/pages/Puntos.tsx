import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, TrendingUp } from "lucide-react";

export default function Puntos() {
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const [historyRes, totalRes] = await Promise.all([
          supabase.from("puntos").select("*").order("created_at", { ascending: false }),
          supabase.from("vista_puntos_totales").select("*"),
        ]);
        if (historyRes.data) setPointsHistory(historyRes.data);
        const viewRow = totalRes.data?.[0];
        const total =
          viewRow?.total_puntos ??
          viewRow?.total ??
          viewRow?.puntos ??
          historyRes.data?.reduce((acc, curr) => acc + (curr.puntos || curr.points || 0), 0) ??
          0;
        setTotalPoints(total);
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Layout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Puntos y Recompensas</h1>
          <p className="text-muted-foreground mt-1">Gana puntos por mantener hábitos saludables.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Balance Actual</p>
                <div className="text-5xl font-bold mt-2 flex items-baseline gap-2 text-foreground" data-testid="text-total-points">
                  {totalPoints} <span className="text-xl text-muted-foreground font-normal">pts</span>
                </div>
              </div>
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center">
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                Nivel Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">Entusiasta</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{totalPoints} / 1000</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (totalPoints / 1000) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Puntos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted rounded-md" />
                ))}
              </div>
            ) : pointsHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto opacity-20 mb-4" />
                <p>Aún no has ganado puntos. ¡Comienza a registrar tus hábitos!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pointsHistory.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-4 border rounded-lg hover-elevate" data-testid={`row-points-${entry.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{entry.motivo || entry.reason || "Recompensa"}</p>
                        <p className="text-sm text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="font-bold text-lg text-primary">+{entry.puntos ?? entry.points}</div>
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
