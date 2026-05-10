import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, ShoppingBasket } from "lucide-react";

export default function Despensa() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return; }
    async function load() {
      try {
        const { data } = await supabase!
          .from("ingredientes")
          .select("*")
          .eq("usuario_id", user!.id)
          .order("nombre");
        if (data) setIngredients(data);
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
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Despensa</h1>
            <p className="text-muted-foreground mt-1">Gestiona los ingredientes que tienes disponibles.</p>
          </div>
          <Button data-testid="button-add-ingredient">
            <Plus className="h-4 w-4 mr-2" /> Añadir Ingrediente
          </Button>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar ingredientes..." className="pl-10" data-testid="input-search-ingredients" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Card key={i} className="animate-pulse h-32 bg-muted" />)}
          </div>
        ) : ingredients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBasket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Despensa vacía</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">No tienes ingredientes registrados en tu despensa todavía.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ingredients.map((ing) => (
              <Card key={ing.id} className="hover:shadow-md transition-all" data-testid={`card-ingredient-${ing.id}`}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{ing.nombre || ing.name}</h3>
                  <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                    <span>{ing.cantidad ?? ing.quantity} {ing.unidad || ing.unit}</span>
                    <span className="px-2 py-1 rounded bg-secondary">{ing.categoria || ing.category || "General"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
