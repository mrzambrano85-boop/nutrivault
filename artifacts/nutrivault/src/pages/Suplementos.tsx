import { Layout } from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pill } from "lucide-react";

const FRECUENCIAS = [
  "Diaria",
  "Cada 12 horas",
  "Cada 8 horas",
  "Semanal",
  "Con el desayuno",
  "Con el almuerzo",
  "Con la cena",
  "Según necesidad",
];
const MOMENTOS = [
  "manana",
  "tarde",
  "noche",
  "pre_entreno",
  "post_entreno",
  "con_comida",
];
const MOMENTOS_LABEL: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
  pre_entreno: "Pre-entreno",
  post_entreno: "Post-entreno",
  con_comida: "Con comida",
};

export default function Suplementos() {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre_producto: "",
    marca: "",
    dosis_por_servicio: "",
    unidad_dosis: "g",
    frecuencia_diaria: "1",
    momento_toma: "manana",
    activo: true,
  });
  const [formError, setFormError] = useState("");

  async function load() {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("suplementos")
        .select("*")
        .eq("usuario_id", user.id)
        .order("nombre_producto");
      if (data) setSupplements(data);
    } catch {
      // empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    if (!form.nombre_producto.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    if (!form.dosis_por_servicio.trim()) {
      setFormError("La dosis es obligatoria.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const { error } = await supabase.from("suplementos").insert({
        nombre_producto: form.nombre_producto.trim(),
        marca: form.marca.trim(),
        dosis_por_servicio: parseFloat(form.dosis_por_servicio),
        unidad_dosis: form.unidad_dosis,
        frecuencia_diaria: parseInt(form.frecuencia_diaria),
        momento_toma: form.momento_toma,
        activo: form.activo,
        usuario_id: user.id,
        fecha_inicio: new Date().toISOString().split("T")[0],
      });
      if (error) {
        setFormError(error.message);
        return;
      }
      setOpen(false);
      setForm({
        nombre_producto: "",
        marca: "",
        dosis_por_servicio: "",
        unidad_dosis: "g",
        frecuencia_diaria: "1",
        momento_toma: "manana",
        activo: true,
      });
      setLoading(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suplementos</h1>
            <p className="text-muted-foreground mt-1">
              Rastrea tu ingesta diaria de suplementos.
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              setFormError("");
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Añadir Suplemento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Añadir Suplemento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nombre del producto</Label>
                  <Input
                    placeholder="Ej: Vitamina D, Omega 3, Magnesio..."
                    value={form.nombre_producto}
                    onChange={(e) =>
                      setForm({ ...form, nombre_producto: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca (opcional)</Label>
                  <Input
                    placeholder="Ej: Nature Made, Now Foods..."
                    value={form.marca}
                    onChange={(e) =>
                      setForm({ ...form, marca: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dosis por servicio</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Ej: 1000"
                      value={form.dosis_por_servicio}
                      onChange={(e) =>
                        setForm({ ...form, dosis_por_servicio: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad</Label>
                    <Select
                      value={form.unidad_dosis}
                      onValueChange={(v) =>
                        setForm({ ...form, unidad_dosis: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["g", "mg", "ml", "capsula", "tableta", "scoop"].map(
                          (u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Veces al día</Label>
                    <Select
                      value={form.frecuencia_diaria}
                      onValueChange={(v) =>
                        setForm({ ...form, frecuencia_diaria: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "2", "3", "4"].map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}x al día
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Momento de toma</Label>
                    <Select
                      value={form.momento_toma}
                      onValueChange={(v) =>
                        setForm({ ...form, momento_toma: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOMENTOS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {MOMENTOS_LABEL[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Activo</p>
                    <p className="text-xs text-muted-foreground">
                      Incluir en seguimiento diario
                    </p>
                  </div>
                  <Switch
                    checked={form.activo}
                    onCheckedChange={(v) => setForm({ ...form, activo: v })}
                  />
                </div>
                {formError && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    {formError}
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
              <p className="text-muted-foreground mt-2 max-w-sm">
                No estás rastreando ningún suplemento. Añade el primero.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {supplements.map((sup) => (
              <Card
                key={sup.id}
                className={`transition-all ${sup.activo ? "border-primary/20 hover:shadow-md" : "opacity-55"}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${sup.activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      <Pill className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{sup.nombre_producto}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sup.dosis_por_servicio} {sup.unidad_dosis}
                        {sup.frecuencia_diaria &&
                          ` · ${sup.frecuencia_diaria}x al día`}
                        {sup.momento_toma &&
                          ` · ${MOMENTOS_LABEL[sup.momento_toma] || sup.momento_toma}`}
                      </p>
                      {sup.marca && (
                        <p className="text-xs text-muted-foreground">
                          {sup.marca}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${sup.activo ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}
                  >
                    {sup.activo ? "Activo" : "Inactivo"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
