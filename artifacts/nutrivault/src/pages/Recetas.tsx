import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock, BookOpen, Users, Sparkles, ChevronDown, ChevronUp,
  AlertCircle, RotateCcw, ChefHat, Check, AlertTriangle, Star,
} from "lucide-react";

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

interface DespensaItem {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

interface IngMatch {
  recetaTexto: string;      // original recipe ingredient string
  despensaItem: DespensaItem | null;
  cantidadDeducir: number;
  nuevaCantidad: number;
  esBajo: boolean;          // < 20% remaining
  seAgota: boolean;         // <= 0 remaining
}

const PUNTOS_POR_RECETA = 100;
const UMBRAL_BAJO = 0.2;   // warn if < 20% remaining

// --- Parsing helpers ---

function parseAmount(text: string): number {
  // "2 tazas de arroz" → 2 | "500g pollo" → 500 | "½ cebolla" → 0.5
  const vulgar: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.33, "⅔": 0.67 };
  for (const [sym, val] of Object.entries(vulgar)) {
    if (text.startsWith(sym)) return val;
  }
  const m = text.match(/^(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : 1;
}

function extractCoreName(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\d+\.?\d*\s*/, "")            // leading number
    .replace(/^(kg|g|ml|l|gr|oz|lb|tazas?|cucharadas?|cucharitas?|piezas?|unidades?|latas?|dientes?|ramas?|hojas?)\s*/i, "")
    .replace(/^de\s+/i, "")
    .replace(/\s+picad[ao]s?\b/g, "")
    .replace(/\s+cortad[ao]s?\b/g, "")
    .replace(/\s+molid[ao]s?\b/g, "")
    .replace(/\s+cocid[ao]s?\b/g, "")
    .trim();
}

function matchDespensa(recetaIng: string, despensa: DespensaItem[]): DespensaItem | null {
  const core = extractCoreName(recetaIng);
  if (!core) return null;

  // Exact or substring match
  const words = core.split(/\s+/).filter((w) => w.length > 2);

  return (
    despensa.find((d) => {
      const dName = d.nombre.toLowerCase();
      return dName === core || dName.includes(core) || core.includes(dName);
    }) ??
    despensa.find((d) => {
      const dName = d.nombre.toLowerCase();
      return words.some((w) => dName.includes(w));
    }) ??
    null
  );
}

function buildMatches(receta: RecetaPlan, despensa: DespensaItem[]): IngMatch[] {
  return receta.ingredientes.map((ing) => {
    const item = matchDespensa(ing, despensa);
    const cantidadDeducir = item ? Math.min(parseAmount(ing), item.cantidad) : 0;
    const nuevaCantidad = item ? Math.max(0, item.cantidad - cantidadDeducir) : 0;
    const esBajo = item
      ? nuevaCantidad < item.cantidad * UMBRAL_BAJO && nuevaCantidad > 0
      : false;
    const seAgota = item ? nuevaCantidad <= 0 : false;

    return { recetaTexto: ing, despensaItem: item, cantidadDeducir, nuevaCantidad, esBajo, seAgota };
  });
}

// --- Main component ---

export default function Recetas() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Diet plan state
  const [generando, setGenerando] = useState(false);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [planesError, setPlanesError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Cooking dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<"confirming" | "guardando" | "exito">("confirming");
  const [recetaActiva, setRecetaActiva] = useState<RecetaPlan | null>(null);
  const [matches, setMatches] = useState<IngMatch[]>([]);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [cookError, setCookError] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.from("recetas").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setRecipes(data); })
      .finally(() => setLoading(false));
  }, []);

  // --- Diet plan generation ---
  async function generarPlanes() {
    if (!supabase || !user) return;
    setGenerando(true);
    setPlanesError("");
    try {
      const { data: ings } = await supabase
        .from("ingredientes").select("nombre, cantidad, unidad").eq("usuario_id", user.id);
      if (!ings || ings.length === 0) {
        setPlanesError("No tienes ingredientes en tu despensa. Añade algunos primero.");
        return;
      }
      const res = await fetch("/api/generar-planes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientes: ings.map((i: any) => `${i.nombre} (${i.cantidad} ${i.unidad})`) }),
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

  // --- Cooking flow ---
  async function abrirDialogoCocinar(receta: RecetaPlan) {
    if (!supabase || !user) return;
    setRecetaActiva(receta);
    setDialogStep("confirming");
    setCookError("");
    setAlertas([]);
    setLoadingMatches(true);
    setDialogOpen(true);

    try {
      const { data } = await supabase
        .from("ingredientes").select("id, nombre, cantidad, unidad").eq("usuario_id", user.id);
      const despensa: DespensaItem[] = data ?? [];
      setMatches(buildMatches(receta, despensa));
    } catch {
      setCookError("No se pudo cargar tu despensa. Intenta de nuevo.");
    } finally {
      setLoadingMatches(false);
    }
  }

  async function confirmarCocinado() {
    if (!supabase || !user || !recetaActiva) return;
    setDialogStep("guardando");
    setCookError("");

    try {
      const matchesConItem = matches.filter((m) => m.despensaItem !== null);

      // 1. Update each matched ingredient in despensa
      for (const m of matchesConItem) {
        if (m.cantidadDeducir <= 0) continue;
        const { error } = await supabase
          .from("ingredientes")
          .update({ cantidad: m.nuevaCantidad })
          .eq("id", m.despensaItem!.id)
          .eq("usuario_id", user.id);
        if (error) throw new Error(`No se pudo actualizar ${m.despensaItem!.nombre}: ${error.message}`);
      }

      // 2. Register points
      const { error: puntosError } = await supabase.from("puntos").insert({
        usuario_id: user.id,
        concepto: `Receta cocinada: ${recetaActiva.nombre}`,
        cantidad: PUNTOS_POR_RECETA,
      });
      if (puntosError) console.warn("No se pudieron registrar puntos:", puntosError.message);

      // 3. Build alerts
      const nuevasAlertas: string[] = [];
      for (const m of matchesConItem) {
        if (m.seAgota) {
          nuevasAlertas.push(`Tu ${m.despensaItem!.nombre} se ha agotado. Recuerda anotarlo en tu proxima lista de compras.`);
        } else if (m.esBajo) {
          nuevasAlertas.push(`Cuidado, ya casi se te acaba el ${m.despensaItem!.nombre} (quedan ${m.nuevaCantidad} ${m.despensaItem!.unidad}).`);
        }
      }
      setAlertas(nuevasAlertas);
      setDialogStep("exito");
    } catch (err: unknown) {
      setCookError(err instanceof Error ? err.message : "Algo salió mal. Intenta de nuevo.");
      setDialogStep("confirming");
    }
  }

  function cerrarDialogo() {
    setDialogOpen(false);
    setRecetaActiva(null);
    setMatches([]);
    setAlertas([]);
    setCookError("");
  }

  function toggleReceta(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const difColor = (d: string) => {
    if (d === "facil") return "bg-green-100 text-green-700";
    if (d === "media") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const matchesConItem = matches.filter((m) => m.despensaItem !== null);
  const matchesSinItem = matches.filter((m) => m.despensaItem === null);

  return (
    <Layout>
      <div className="space-y-10">

        {/* ── COOKING CONFIRMATION DIALOG ── */}
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) cerrarDialogo(); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {recetaActiva?.nombre}
              </DialogTitle>
            </DialogHeader>

            {/* Step: confirming */}
            {dialogStep === "confirming" && (
              <div className="space-y-5">
                {loadingMatches ? (
                  <div className="flex items-center gap-3 py-4">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-sm text-muted-foreground">Revisando tu despensa...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Ingredientes que se descontaran de tu despensa
                      </p>
                      {matchesConItem.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          No encontramos ninguno de estos ingredientes en tu despensa. Se registrara la receta de todas formas.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {matchesConItem.map((m, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                              <div>
                                <p className="font-medium">{m.despensaItem!.nombre}</p>
                                <p className="text-muted-foreground text-xs mt-0.5">{m.recetaTexto}</p>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="font-semibold text-destructive">
                                  -{m.cantidadDeducir} {m.despensaItem!.unidad}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Quedaran: {m.nuevaCantidad} {m.despensaItem!.unidad}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {matchesSinItem.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          No encontrados en despensa (no se descontaran)
                        </p>
                        <div className="space-y-1">
                          {matchesSinItem.map((m, i) => (
                            <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                              {m.recetaTexto}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex items-center gap-3">
                      <Star className="h-5 w-5 text-primary shrink-0" />
                      <p className="text-sm text-primary font-medium">
                        Ganaras <strong>{PUNTOS_POR_RECETA} puntos</strong> por cocinar esta receta.
                      </p>
                    </div>

                    {cookError && (
                      <div className="rounded-lg bg-destructive/10 px-4 py-3 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {cookError}
                      </div>
                    )}

                    <div className="flex gap-3 pt-1">
                      <Button variant="outline" className="flex-1" onClick={cerrarDialogo}>
                        Cancelar
                      </Button>
                      <Button className="flex-1" onClick={confirmarCocinado} disabled={loadingMatches}>
                        <ChefHat className="h-4 w-4 mr-2" /> Confirmar y cocinar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step: guardando */}
            {dialogStep === "guardando" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                <p className="text-muted-foreground text-sm">Actualizando tu despensa y registrando puntos...</p>
              </div>
            )}

            {/* Step: exito */}
            {dialogStep === "exito" && (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Buen provecho!</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      Tu despensa se actualizo y ganaste{" "}
                      <span className="font-bold text-primary">{PUNTOS_POR_RECETA} puntos</span> por cocinar{" "}
                      <span className="font-medium">{recetaActiva?.nombre}</span>.
                    </p>
                  </div>
                </div>

                {alertas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Atención en tu despensa
                    </p>
                    {alertas.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                        {a}
                      </div>
                    ))}
                  </div>
                )}

                <Button className="w-full" onClick={cerrarDialogo}>
                  Listo
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── DIET PLAN GENERATOR ── */}
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
              <Button onClick={generarPlanes} disabled={generando} data-testid="button-generate-plans">
                <Sparkles className="h-4 w-4 mr-2" />
                {generando ? "Generando con Claude..." : "Generar planes de dieta"}
              </Button>
            </div>
          </div>

          {generando && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-sm text-primary font-medium">Claude está creando tus planes de dieta personalizados...</p>
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
                                  <Clock className="h-3.5 w-3.5" /> {receta.tiempo} min
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" /> {receta.porciones} porciones
                                </span>
                              </div>
                            </div>
                            {open
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
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
                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Preparacion</p>
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

                              {/* RECETA COCINADA BUTTON */}
                              <div className="pt-2 border-t">
                                <Button
                                  variant="outline"
                                  className="w-full border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors"
                                  onClick={(e) => { e.stopPropagation(); abrirDialogoCocinar(receta); }}
                                  data-testid={`button-cocinar-${pi}-${ri}`}
                                >
                                  <ChefHat className="h-4 w-4 mr-2" />
                                  Receta Cocinada ✓
                                </Button>
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
                  Pulsa "Generar planes de dieta" y Claude creara 3 planes adaptados a los ingredientes de tu despensa.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ── SAVED RECIPES ── */}
        {(loading || recipes.length > 0) && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recetas guardadas</h2>
              <p className="text-muted-foreground mt-1">Explora comidas saludables y nutritivas.</p>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-64 bg-muted" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((r) => (
                  <Card key={r.id} className="overflow-hidden hover:shadow-md transition-all flex flex-col">
                    <div style={{ height: "160px", background: "linear-gradient(135deg,#f0fdf4,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {r.tiempo_minutos} min</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {r.porciones} porc.</span>
                      </div>
                      <Button variant="secondary" size="sm" className="w-full">Ver Receta</Button>
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
