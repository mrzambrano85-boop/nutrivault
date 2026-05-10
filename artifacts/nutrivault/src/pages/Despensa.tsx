import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, ShoppingBasket } from "lucide-react";

const CATEGORIAS = ["Frutas", "Verduras", "Lácteos", "Carnes", "Granos", "Bebidas", "Condimentos", "Otros"];
const UNIDADES = ["g", "kg", "ml", "L", "unidades", "tazas", "cucharadas", "piezas"];

export default function Despensa() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", cantidad: "", unidad: "g", categoria: "Otros" });
  const [formError, setFormError] = useState("");

  async function load() {
    if (!supabase || !user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("ingredientes")
        .select("*")
        .eq("usuario_id", user.id)
        .order("nombre");
      if (data) setIngredients(data);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    if (!form.cantidad || isNaN(Number(form.cantidad))) { setFormError("La cantidad debe ser un número."); return; }

    setSaving(true);
    setFormError("");
    try {
      const { error } = await supabase.from("ingredientes").insert({
        nombre: form.nombre.trim(),
        cantidad: Number(form.cantidad),
        unidad: form.unidad,
        categoria: form.categoria,
        usuario_id: user.id,
      });
      if (error) { setFormError(error.message); return; }
      setOpen(false);
      setForm({ nombre: "", cantidad: "", unidad: "g", categoria: "Otros" });
      setLoading(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const filtered = ingredients.filter((i) =>
    (i.nombre || i.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Despensa</h1>
            <p className="text-muted-foreground mt-1">Gestiona los ingredientes que tienes disponibles.</p>
          </div>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); setFormError(""); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-ingredient">
                <Plus className="h-4 w-4 mr-2" /> Añadir Ingrediente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Añadir Ingrediente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="ing-nombre">Nombre</Label>
                  <Input
                    id="ing-nombre"
                    placeholder="Ej: Avena, Pollo, Leche..."
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    data-testid="input-ing-nombre"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ing-cantidad">Cantidad</Label>
                    <Input
                      id="ing-cantidad"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.cantidad}
                      onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                      data-testid="input-ing-cantidad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad</Label>
                    <Select value={form.unidad} onValueChange={(v) => setForm({ ...form, unidad: v })}>
                      <SelectTrigger data-testid="select-ing-unidad">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger data-testid="select-ing-categoria">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formError && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md" data-testid="text-form-error">
                    {formError}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} data-testid="button-save-ingredient">
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingredientes..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-ingredients"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Card key={i} className="animate-pulse h-32 bg-muted" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBasket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">
                {search ? "Sin resultados" : "Despensa vacía"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-sm">
                {search
                  ? `No se encontró "${search}" en tu despensa.`
                  : "No tienes ingredientes registrados todavía. Añade el primero."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ing) => (
              <Card key={ing.id} className="hover:shadow-md transition-all" data-testid={`card-ingredient-${ing.id}`}>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{ing.nombre || ing.name}</h3>
                  <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {ing.cantidad ?? ing.quantity} {ing.unidad || ing.unit}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {ing.categoria || ing.category || "General"}
                    </span>
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
