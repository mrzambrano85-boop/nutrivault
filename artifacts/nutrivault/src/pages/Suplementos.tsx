import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pill, Check } from "lucide-react";

export default function Suplementos() {
  const [supplements, setSupplements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.from("supplements").select("*").order("name");
        if (data) setSupplements(data);
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
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suplementos</h1>
            <p className="text-muted-foreground mt-1">Rastrea tu ingesta diaria de suplementos.</p>
          </div>
          <Button data-testid="button-add-supplement">
            <Plus className="h-4 w-4 mr-2" /> Añadir Suplemento
          </Button>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-20 bg-muted" />
            ))}
          </div>
        ) : supplements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Sin suplementos</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">No estás rastreando ningún suplemento actualmente.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {supplements.map((sup) => (
              <Card key={sup.id} className={sup.active ? "border-primary/50" : "opacity-60"} data-testid={`card-supplement-${sup.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${sup.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Pill className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{sup.name}</h3>
                      <p className="text-sm text-muted-foreground">{sup.dosage} • {sup.frequency}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${sup.active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-secondary text-secondary-foreground"}`}>
                      {sup.active ? "Activo" : "Inactivo"}
                    </span>
                    {sup.active && (
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" data-testid={`button-check-supplement-${sup.id}`}>
                        <Check className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
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
