import { Layout } from "@/components/layout/Layout";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pill, ScanLine, Camera, Upload, RotateCcw,
  Check, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const FRECUENCIAS = [
  { value: "1", label: "Una vez al día" },
  { value: "2", label: "Dos veces al día" },
  { value: "3", label: "Tres veces al día" },
  { value: "3c", label: "Con cada comida" },
];

const MOMENTOS = [
  { value: "manana", label: "Mañana" },
  { value: "mediodia", label: "Mediodía" },
  { value: "noche", label: "Noche" },
  { value: "pre_entreno", label: "Pre-entreno" },
  { value: "post_entreno", label: "Post-entreno" },
  { value: "con_desayuno", label: "Con el desayuno" },
  { value: "con_almuerzo", label: "Con el almuerzo" },
  { value: "con_cena", label: "Con la cena" },
];

const MOMENTOS_LABEL: Record<string, string> = Object.fromEntries(
  MOMENTOS.map((m) => [m.value, m.label])
);

const FREC_POR_DIA: Record<string, number> = {
  "1": 1, "2": 2, "3": 3, "3c": 3,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasRestantes(sup: any): number | null {
  if (sup.unidades_restantes == null || !sup.frecuencia_diaria) return null;
  const porDia = FREC_POR_DIA[String(sup.frecuencia_diaria)] ?? Number(sup.frecuencia_diaria);
  return Math.max(0, Math.floor(sup.unidades_restantes / porDia));
}

function fechaAgotamiento(sup: any): string | null {
  const dias = diasRestantes(sup);
  if (dias == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function pctRestante(sup: any): number {
  if (!sup.total_unidades || sup.unidades_restantes == null) return 0;
  return Math.min(100, (sup.unidades_restantes / sup.total_unidades) * 100);
}

// ─── Form blank ──────────────────────────────────────────────────────────────

const FORM_BLANK = {
  nombre_producto: "",
  marca: "",
  cantidad_escaneada: "",
  total_unidades: "",
  frecuencia_diaria: "1",
  momento_toma: "manana",
  activo: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Suplementos() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [supplements, setSupplements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── Add/Scan dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"choice" | "scanning" | "form">("choice");
  const [form, setForm] = useState({ ...FORM_BLANK });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Scan flow
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [imgMime, setImgMime] = useState("image/jpeg");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  // ── Dose taken feedback
  const [tomarLoading, setTomarLoading] = useState<Record<string, boolean>>({});
  const [tomarAlert, setTomarAlert] = useState<Record<string, string>>({});

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function load() {
    if (!supabase || !user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("suplementos")
        .select("*")
        .eq("usuario_id", user.id)
        .order("nombre_producto");
      if (data) setSupplements(data);
    } catch { /* empty state */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

  // ─── Dialog helpers ────────────────────────────────────────────────────────

  function openDialog(mode: "choice" | "form") {
    setDialogMode(mode);
    setForm({ ...FORM_BLANK });
    setImgPreview(null);
    setImgBase64(null);
    setScanError("");
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setImgPreview(null);
    setImgBase64(null);
    setScanError("");
    setFormError("");
  }

  // ─── Image pick ────────────────────────────────────────────────────────────

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setScanError("El archivo debe ser una imagen (JPEG, PNG o WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const [header, b64] = dataUrl.split(",");
      const mime = header.replace("data:", "").replace(";base64", "");
      setImgPreview(dataUrl);
      setImgBase64(b64);
      setImgMime(mime);
      setDialogMode("scanning");
    };
    reader.readAsDataURL(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = "";
  }

  // ─── Scan ──────────────────────────────────────────────────────────────────

  async function escanearEtiqueta() {
    if (!imgBase64) return;
    setScanning(true);
    setScanError("");
    try {
      const res = await fetch("/api/scan-suplemento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgBase64, mimeType: imgMime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al escanear la etiqueta.");
      setForm((f) => ({
        ...f,
        nombre_producto: data.nombre || f.nombre_producto,
        marca: data.marca || f.marca,
        cantidad_escaneada: data.cantidad || f.cantidad_escaneada,
      }));
      setDialogMode("form");
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "Error desconocido al escanear.");
    } finally {
      setScanning(false);
    }
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    if (!form.nombre_producto.trim()) { setFormError("El nombre del suplemento es obligatorio."); return; }

    setSaving(true);
    setFormError("");
    try {
      const totalUnidades = form.total_unidades ? parseInt(form.total_unidades) : null;
      const { error } = await supabase.from("suplementos").insert({
        nombre_producto: form.nombre_producto.trim(),
        marca: form.marca.trim() || null,
        cantidad_escaneada: form.cantidad_escaneada.trim() || null,
        total_unidades: totalUnidades,
        unidades_restantes: totalUnidades,
        frecuencia_diaria: form.frecuencia_diaria,
        momento_toma: form.momento_toma,
        activo: form.activo,
        usuario_id: user.id,
        fecha_inicio: new Date().toISOString().split("T")[0],
      });
      if (error) { setFormError(error.message); return; }
      closeDialog();
      setLoading(true);
      await load();
    } finally {
      setSaving(false);
    }
  }

  // ─── Take dose ─────────────────────────────────────────────────────────────

  async function tomarDosis(supId: string) {
    if (!supabase || !user) return;
    const sup = supplements.find((s) => s.id === supId);
    if (!sup || sup.unidades_restantes == null) return;

    setTomarLoading((p) => ({ ...p, [supId]: true }));
    const nuevas = Math.max(0, (sup.unidades_restantes ?? 1) - 1);

    // Optimistic update
    setSupplements((prev) =>
      prev.map((s) => (s.id === supId ? { ...s, unidades_restantes: nuevas } : s))
    );

    try {
      await supabase
        .from("suplementos")
        .update({ unidades_restantes: nuevas })
        .eq("id", supId)
        .eq("usuario_id", user.id);

      // Alert check
      const tempSup = { ...sup, unidades_restantes: nuevas };
      const dias = diasRestantes(tempSup);
      if (dias != null && dias <= 5) {
        const nombre = sup.nombre_producto || "Suplemento";
        setTomarAlert((p) => ({
          ...p,
          [supId]: `¡Tu ${nombre} está por agotarse! Quedan ${dias} día${dias !== 1 ? "s" : ""}.`,
        }));
      } else {
        setTomarAlert((p) => ({ ...p, [supId]: "" }));
      }
    } catch {
      // revert optimistic
      setSupplements((prev) =>
        prev.map((s) => (s.id === supId ? { ...s, unidades_restantes: sup.unidades_restantes } : s))
      );
    } finally {
      setTomarLoading((p) => ({ ...p, [supId]: false }));
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

      {/* ── Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "choice" && "Añadir Suplemento"}
              {dialogMode === "scanning" && "Escanear etiqueta"}
              {dialogMode === "form" && "Datos del suplemento"}
            </DialogTitle>
          </DialogHeader>

          {/* CHOICE */}
          {dialogMode === "choice" && (
            <div className="space-y-3 mt-2">
              <button
                onClick={() => { setDialogMode("scanning"); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ScanLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Escanear etiqueta del frasco</p>
                  <p className="text-sm text-muted-foreground">Claude lee la marca, nombre y cantidad automáticamente</p>
                </div>
              </button>
              <button
                onClick={() => setDialogMode("form")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-muted hover:border-muted-foreground/30 hover:bg-muted/30 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Agregar manualmente</p>
                  <p className="text-sm text-muted-foreground">Ingresa los datos tú mismo</p>
                </div>
              </button>
            </div>
          )}

          {/* SCANNING — image capture or preview + scan button */}
          {dialogMode === "scanning" && (
            <div className="space-y-4 mt-2">
              {!imgPreview ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Toma una foto clara de la etiqueta del frasco, asegurándote de que el nombre y la dosis sean legibles.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => fileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> Subir foto
                    </Button>
                    <Button variant="outline" onClick={() => cameraRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" /> Cámara
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={imgPreview}
                    alt="Etiqueta del suplemento"
                    className="w-full max-h-64 object-contain rounded-lg bg-muted"
                  />
                  {scanning && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      Claude está leyendo la etiqueta...
                    </div>
                  )}
                  {scanError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{scanError}</p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      onClick={escanearEtiqueta}
                      disabled={scanning}
                      className="flex-1"
                    >
                      <ScanLine className="h-4 w-4 mr-2" />
                      {scanning ? "Escaneando..." : "Escanear etiqueta"}
                    </Button>
                    <Button variant="outline" onClick={() => { setImgPreview(null); setImgBase64(null); setScanError(""); }}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
              <Button variant="ghost" className="w-full" onClick={() => setDialogMode("choice")}>
                Volver
              </Button>
            </div>
          )}

          {/* FORM */}
          {dialogMode === "form" && (
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              {/* Scan result banner */}
              {form.cantidad_escaneada && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-sm text-primary">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>Etiqueta escaneada correctamente. Revisa y completa los campos.</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nombre del suplemento *</Label>
                <Input
                  placeholder="Ej: Vitamina D3, Omega-3, Proteína de Suero..."
                  value={form.nombre_producto}
                  onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })}
                  data-testid="input-sup-nombre"
                />
              </div>

              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ej: NOW Foods, Nature Made..."
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cantidad por dosis (de la etiqueta)</Label>
                <Input
                  placeholder="Ej: 1000 mg, 2000 IU, 25 g, 1 scoop"
                  value={form.cantidad_escaneada}
                  onChange={(e) => setForm({ ...form, cantidad_escaneada: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Total de unidades en el frasco</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ej: 90 cápsulas, 30 scoops → escribe el número"
                  value={form.total_unidades}
                  onChange={(e) => setForm({ ...form, total_unidades: e.target.value })}
                  data-testid="input-sup-total"
                />
                <p className="text-xs text-muted-foreground">Este número se usará para calcular cuántos días te quedan.</p>
              </div>

              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={form.frecuencia_diaria} onValueChange={(v) => setForm({ ...form, frecuencia_diaria: v })}>
                  <SelectTrigger data-testid="select-sup-frecuencia">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRECUENCIAS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Hora de toma</Label>
                <Select value={form.momento_toma} onValueChange={(v) => setForm({ ...form, momento_toma: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOMENTOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">Activo</p>
                  <p className="text-xs text-muted-foreground">Incluir en seguimiento diario</p>
                </div>
                <Switch
                  checked={form.activo}
                  onCheckedChange={(v) => setForm({ ...form, activo: v })}
                />
              </div>

              {formError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{formError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1" data-testid="button-save-supplement">
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Page ── */}
      <div className="space-y-6">
        <header className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suplementos</h1>
            <p className="text-muted-foreground mt-1">Rastrea tu inventario y toma diaria de suplementos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDialog("choice")} data-testid="button-scan-supplement">
              <ScanLine className="h-4 w-4 mr-2" /> Escanear etiqueta
            </Button>
            <Button onClick={() => openDialog("form")} data-testid="button-add-supplement">
              <Plus className="h-4 w-4 mr-2" /> Añadir
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-28 bg-muted" />)}
          </div>
        ) : supplements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Sin suplementos</h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                Escanea la etiqueta de tu frasco o agrega un suplemento manualmente para comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {supplements.map((sup) => {
              const dias = diasRestantes(sup);
              const fecha = fechaAgotamiento(sup);
              const pct = pctRestante(sup);
              const isLow = dias != null && dias <= 5;
              const isExpanded = !!expanded[sup.id];
              const alerta = tomarAlert[sup.id];
              const tieneTracking = sup.total_unidades != null;

              return (
                <Card
                  key={sup.id}
                  className={`transition-all ${
                    isLow && tieneTracking
                      ? "border-red-300 bg-red-50/40"
                      : sup.activo
                        ? "border-primary/20 hover:shadow-md"
                        : "opacity-55"
                  }`}
                  data-testid={`card-supplement-${sup.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          isLow && tieneTracking
                            ? "bg-red-100 text-red-600"
                            : sup.activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          <Pill className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-tight">{sup.nombre_producto}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {[sup.marca, sup.cantidad_escaneada].filter(Boolean).join(" · ")}
                            {sup.momento_toma && ` · ${MOMENTOS_LABEL[sup.momento_toma] || sup.momento_toma}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          isLow && tieneTracking
                            ? "bg-red-100 text-red-700"
                            : sup.activo
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-secondary-foreground"
                        }`}>
                          {sup.activo ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [sup.id]: !p[sup.id] }))}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Inventory bar */}
                    {tieneTracking && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {sup.unidades_restantes ?? 0} de {sup.total_unidades} unidades
                          </span>
                          <span>
                            {dias != null ? `${dias} día${dias !== 1 ? "s" : ""}` : ""}
                            {fecha ? ` · hasta el ${fecha}` : ""}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className={`h-2 ${isLow ? "[&>div]:bg-red-500" : ""}`}
                        />
                      </div>
                    )}

                    {/* Low stock alert */}
                    {(isLow && tieneTracking) || alerta ? (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-100 border border-red-200 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <span>
                          {alerta || `¡Tu ${sup.nombre_producto} está por agotarse! Quedan ${dias} día${dias !== 1 ? "s" : ""}.`}
                        </span>
                      </div>
                    ) : null}

                    {/* Expanded: take dose button */}
                    {isExpanded && sup.activo && (
                      <div className="pt-1 border-t space-y-2">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p><span className="font-medium">Frecuencia:</span> {FRECUENCIAS.find(f => f.value === String(sup.frecuencia_diaria))?.label ?? sup.frecuencia_diaria}</p>
                          {sup.frecuencia_diaria && (
                            <p><span className="font-medium">Dosis/día:</span> {FREC_POR_DIA[String(sup.frecuencia_diaria)] ?? sup.frecuencia_diaria}</p>
                          )}
                        </div>

                        {tieneTracking && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors"
                            disabled={!!tomarLoading[sup.id] || (sup.unidades_restantes ?? 0) <= 0}
                            onClick={() => tomarDosis(sup.id)}
                            data-testid={`button-tomar-${sup.id}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {tomarLoading[sup.id]
                              ? "Registrando..."
                              : (sup.unidades_restantes ?? 0) <= 0
                                ? "Sin unidades restantes"
                                : "Tomé mi dosis"}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
