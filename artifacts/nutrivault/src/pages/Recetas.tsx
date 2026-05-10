import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen } from "lucide-react";

export default function Recetas() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.from("recetas").select("*").order("created_at", { ascending: false });
        if (data) setRecipes(data);
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
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Recetas</h1>
          <p className="text-muted-foreground mt-1">Explora comidas saludables y nutritivas.</p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-64 bg-muted" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">No hay recetas</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">No se encontraron recetas disponibles en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden hover-elevate transition-all flex flex-col" data-testid={`card-recipe-${recipe.id}`}>
                <div className="h-48 bg-muted w-full relative">
                  {(recipe.imagen_url || recipe.image_url) ? (
                    <img src={recipe.imagen_url || recipe.image_url} alt={recipe.titulo || recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <BookOpen className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-xl line-clamp-1">{recipe.titulo || recipe.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2">{recipe.descripcion || recipe.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-4 flex justify-between items-center border-t">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    {recipe.tiempo_preparacion ?? recipe.prep_time_minutes ?? 30} min
                  </div>
                  <Button variant="secondary" size="sm" data-testid={`button-view-recipe-${recipe.id}`}>Ver Receta</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
