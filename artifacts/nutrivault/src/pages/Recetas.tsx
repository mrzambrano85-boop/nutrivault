import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Users, Sparkles, ChevronDown, ChevronUp, AlertCircle, RotateCcw } from "lucide-react";

interface RecetaPlan {
  nombre: string;
  ingredientes: string[];
  pasos: string[];
  tiempo: number;
  porciones: number;
}

interface Plan {
  titulo: string;
  descripcion: string;
  recetas: RecetaPlan[];
}

export default function Recetas() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Diet plan state
  const [generando, setGenerando] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planesError, setPlanesError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    async function load() {
      try {
        const { data } = await supabase!
          .from("recetas")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setRecipes(data);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function generarPlanes() {
    if (!supabase || !user) return;
    setGenerando(true);
    setPlanesError("");
    try {
      // Fetch user's ingredients
      const { data: ings } = await supabase
        .from("ingredientes")
        .select("nombre, cantidad, unidad")
        .eq("usuario_id", user.id);

      if (!ings || ings.length === 0) {
        setPlanesError("No tienes ingredientes en tu despensa. Añade algunos primero.");
        return;
      }

      const lista = ings.map((i: any) => `${i.nombre} (${i.cantidad} ${i.unidad})`);

      const res = await fetch("/api/generar-planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientes: lista }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar los planes.");
      setPlanes(data.planes ?? []);
    } catch (err: unknown) {
      setPlanesError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setGenerando(false);
    }
  }

  function toggleReceta(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const difColor = (d: string) => {
    if (d === "facil") return "bg-green-100 text-green-700";
    if (d === "media") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <Layout>
      <div className="space-y-10">
        {/* ── Diet plan generator section ── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Planes de Dieta</h1>
              <p className="text-muted-foreground mt-1">
                Claude genera 3 planes saludables basados en los ingredientes de tu despensa.
              </p>
            </div>
            <div className="flex gap-3">
              {planes.length > 0 && (
                <Button variant="outline" onClick={() => { setPlanes([]); setPlanesError(""); }}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Limpiar
                </Button>
              )}
              <Button
                onClick={generarPlanes}
                disabled={generando}
                data-testid="button-generate-plans"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generando ? "Generando con Claude..." : "Generar planes de dieta"}
              </Button>
            </div>
          </div>

          {generando && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm text-primary font-medium">
                  Claude está creando tus planes de dieta personalizados...
                </p>
              </CardContent>
            </Card>
          )}

          {planesError && (
            <Card className="border-destructive/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{planesError}</p>
              </CardContent>
            </Card>
          )}

          {planes.length > 0 && (
            <div className="grid gap-6">
              {planes.map((plan, pi) => (
                <Card key={pi} className="overflow-hidden" data-testid={`card-plan-${pi}`}>
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {pi + 1}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.titulo}</CardTitle>
                        <CardDescription className="mt-1">{plan.descripcion}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 divide-y">
                    {plan.recetas?.map((receta, ri) => {
                      const key = `${pi}-${ri}`;
                      const open = !!expanded[key];
                      return (
                        <div key={ri} data-testid={`receta-${pi}-${ri}`}>
                          <button
                            className="w-full flex items-center justify-between p-5 hover:bg-muted/40 transition-colors text-left"
                            onClick={() => toggleReceta(key)}
                          >
                            <div>
                              <p className="font-semibold">{receta.nombre}</p>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  {receta.tiempo} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {receta.porciones} porciones
                                </span>
                              </div>
                            </div>
                            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </button>

                          {open && (
                            <div className="px-5 pb-5 space-y-4 bg-muted/20">
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Ingredientes</p>
                                <ul className="space-y-1">
                                  {receta.ingredientes?.map((ing, ii) => (
                                    <li key={ii} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">·</span> {ing}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Preparación</p>
                                <ol className="space-y-2">
                                  {receta.pasos?.map((paso, si) => (
                                    <li key={si} className="text-sm flex items-start gap-3">
                                      <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {si + 1}
                                      </span>
                                      {paso}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!generando && planes.length === 0 && !planesError && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">Planes personalizados con IA</h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  Pulsa "Generar planes de dieta" y Claude creará 3 planes adaptados a los ingredientes de tu despensa.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ── Saved recipes section ── */}
        {(loading || recipes.length > 0) && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recetas guardadas</h2>
              <p className="text-muted-foreground mt-1">Explora comidas saludables y nutritivas.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse h-64 bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((r) => (
                  <Card
                    key={r.id}
                    className="overflow-hidden hover:shadow-md transition-all flex flex-col"
                  >
                    <div
                      style={{
                        height: "160px",
                        background: "linear-gradient(135deg,#f0fdf4,#d1fae5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <BookOpen style={{ width: "56px", height: "56px", color: "#86efac" }} />
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">{r.nombre}</CardTitle>
                        {r.dificultad && (
                          <span className={"text-xs px-2 py-0.5 rounded-full font-medium shrink-0 " + difColor(r.dificultad)}>
                            {r.dificultad}
                          </span>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2 mt-1">{r.descripcion}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-3 border-t">
                      <div className="flex justify-between items-center text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {r.tiempo_minutos} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {r.porciones} porc.
                        </span>
                      </div>
                      <Button variant="secondary" size="sm" className="w-full">
                        Ver Receta
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
