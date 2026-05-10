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

const FRECUENCIAS = ["Diaria", "Cada 12 horas", "Cada 8 horas", "Semanal", "Con el desayuno", "Con el almuerzo", "Con la cena", "Según necesidad"];

export default function Suplementos() {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", dosis: "", frecuencia: "Diaria", activo: true });
  const [formError, setFormError] = useState("");

  async function load() {
    if (!supabase || !user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("suplementos")
        .select("*")
        .eq("usuario_id", user.id)
        .order("nombre");
      if (data) setSupplements(data);
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
    if (!form.dosis.trim()) { setFormError("La dosis es obligatoria."); return; }

    setSaving(true);
    setFormError("");
    try {
      const { error } = await supabase.from("suplementos").insert({
        nombre: form.nombre.trim(),
        dosis: form.dosis.trim(),
        frecuencia: form.frecuencia,
        activo: form.activo,
        usuario_id: user.id,
      });
      if (error) { setFormError(error.message); return; }
      setOpen(false);
      setForm({ nombre: "", dosis: "", frecuencia: "Diaria", activo: true });
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
            <p className="text-muted-foreground mt-1">Rastrea tu ingesta diaria de suplementos.</p>
          </div>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); setFormError(""); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-supplement">
                <Plus className="h-4 w-4 mr-2" /> Añadir Suplemento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Añadir Suplemento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="sup-nombre">Nombre</Label>
                  <Input
                    id="sup-nombre"
                    placeholder="Ej: Vitamina D, Omega 3, Magnesio..."
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    data-testid="input-sup-nombre"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sup-dosis">Dosis</Label>
                  <Input
                    id="sup-dosis"
                    placeholder="Ej: 1000 mg, 2 cápsulas, 5 ml..."
                    value={form.dosis}
                    onChange={(e) => setForm({ ...form, dosis: e.target.value })}
                    data-testid="input-sup-dosis"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select value={form.frecuencia} onValueChange={(v) => setForm({ ...form, frecuencia: v })}>
                    <SelectTrigger data-testid="select-sup-frecuencia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRECUENCIAS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Activo</p>
                    <p className="text-xs text-muted-foreground">Incluir en el seguimiento diario</p>
                  </div>
                  <Switch
                    checked={form.activo}
                    onCheckedChange={(v) => setForm({ ...form, activo: v })}
                    data-testid="switch-sup-activo"
                  />
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
                  <Button type="submit" disabled={saving} data-testid="button-save-supplement">
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-20 bg-muted" />)}
          </div>
        ) : supplements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Sin suplementos</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">No estás rastreando ningún suplemento. Añade el primero.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {supplements.map((sup) => (
              <Card
                key={sup.id}
                className={`transition-all ${sup.activo ? "border-primary/20 hover:shadow-md" : "opacity-55"}`}
                data-testid={`card-supplement-${sup.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${sup.activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Pill className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{sup.nombre || sup.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sup.dosis || sup.dosage}
                        {(sup.frecuencia || sup.frequency) && ` · ${sup.frecuencia || sup.frequency}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      sup.activo
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }`}
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
