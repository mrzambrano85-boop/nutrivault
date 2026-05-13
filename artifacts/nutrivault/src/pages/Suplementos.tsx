import { Layout } from "@/components/layout/Layout";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pill, ScanLine, Camera, Upload, RotateCcw, Check, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

const FREC_POR_DIA: Record<string, number> = { "1": 1, "2": 2, "3": 3, "3c": 3 };

function diasRestantes(sup: any): number | null {
  if (sup.unidades_restantes == null || !sup.frecuencia_diaria) return null;
  const porDia = FREC_POR_DIA[String(sup.frecuencia_diaria)] ?? Number(sup.frecuencia_diaria);
  return Math.max(0, Math.floor(sup.unidades_restantes / porDia));
}

function fechaAgotamiento(sup: any, lang: string): string | null {
  const dias = diasRestantes(sup);
  if (dias == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long" });
}

function pctRestante(sup: any): number {
  if (!sup.total_unidades || sup.unidades_restantes == null) return 0;
  return Math.min(100, (sup.unidades_restantes / sup.total_unidades) * 100);
}

const FORM_BLANK = {
  nombre_producto: "", marca: "", cantidad_escaneada: "", total_unidades: "",
  frecuencia_diaria: "1", momento_toma: "manana", activo: true,
};

export default function Suplementos() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [supplements, setSupplements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"choice" | "scanning" | "form">("choice");
  const [form, setForm] = useState({ ...FORM_BLANK });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [imgMime, setImgMime] = useState("image/jpeg");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const [tomarLoading, setTomarLoading] = useState<Record<string, boolean>>({});
  const [tomarAlert, setTomarAlert] = useState<Record<string, string>>({});

  // Translation-aware lookup maps
  const FRECUENCIAS = [
    { value: "1",  label: t("sup.frec_1") },
    { value: "2",  label: t("sup.frec_2") },
    { value: "3",  label: t("sup.frec_3") },
    { value: "3c", label: t("sup.frec_3c") },
  ];

  const MOMENTOS = [
    { value: "manana",        label: t("sup.mom_manana") },
    { value: "mediodia",      label: t("sup.mom_mediodia") },
    { value: "noche",         label: t("sup.mom_noche") },
    { value: "pre_entreno",   label: t("sup.mom_pre") },
    { value: "post_entreno",  label: t("sup.mom_post") },
    { value: "con_desayuno",  label: t("sup.mom_desayuno") },
    { value: "con_almuerzo",  label: t("sup.mom_almuerzo") },
    { value: "con_cena",      label: t("sup.mom_cena") },
  ];

  const MOMENTOS_LABEL = Object.fromEntries(MOMENTOS.map((m) => [m.value, m.label]));

  async function load() {
    if (!supabase || !user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("suplementos").select("*").eq("usuario_id", user.id).order("nombre_producto");
      if (data) setSupplements(data);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user]);

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

  function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) { setScanError(t("tick.err_not_image")); return; }
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
      if (!res.ok) throw new Error(data.error || t("sup.btn_scan_action"));
      setForm((f) => ({
        ...f,
        nombre_producto: data.nombre || f.nombre_producto,
        marca: data.marca || f.marca,
        cantidad_escaneada: data.cantidad || f.cantidad_escaneada,
      }));
      setDialogMode("form");
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : t("sup.btn_scan_action"));
    } finally {
      setScanning(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    if (!form.nombre_producto.trim()) { setFormError(t("sup.err_nombre")); return; }
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

  async function tomarDosis(supId: string) {
    if (!supabase || !user) return;
    const sup = supplements.find((s) => s.id === supId);
    if (!sup || sup.unidades_restantes == null) return;
    setTomarLoading((p) => ({ ...p, [supId]: true }));
    const nuevas = Math.max(0, (sup.unidades_restantes ?? 1) - 1);
    setSupplements((prev) => prev.map((s) => s.id === supId ? { ...s, unidades_restantes: nuevas } : s));
    try {
      await supabase.from("suplementos").update({ unidades_restantes: nuevas }).eq("id", supId).eq("usuario_id", user.id);
      const tempSup = { ...sup, unidades_restantes: nuevas };
      const dias = diasRestantes(tempSup);
      if (dias != null && dias <= 5) {
        const nombre = sup.nombre_producto || "Suplemento";
        setTomarAlert((p) => ({ ...p, [supId]: t("sup.low_stock", { nombre, n: dias }) }));
      } else {
        setTomarAlert((p) => ({ ...p, [supId]: "" }));
      }
    } catch {
      setSupplements((prev) => prev.map((s) => s.id === supId ? { ...s, unidades_restantes: sup.unidades_restantes } : s));
    } finally {
      setTomarLoading((p) => ({ ...p, [supId]: false }));
    }
  }

  return (
    <Layout>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "choice" && t("sup.dialog_add")}
              {dialogMode === "scanning" && t("sup.dialog_scan")}
              {dialogMode === "form" && t("sup.dialog_form")}
            </DialogTitle>
          </DialogHeader>

          {/* CHOICE */}
          {dialogMode === "choice" && (
            <div className="space-y-3 mt-2">
              <button
                onClick={() => setDialogMode("scanning")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ScanLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{t("sup.choice_scan_title")}</p>
                  <p className="text-sm text-muted-foreground">{t("sup.choice_scan_desc")}</p>
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
                  <p className="font-semibold">{t("sup.choice_manual_title")}</p>
                  <p className="text-sm text-muted-foreground">{t("sup.choice_manual_desc")}</p>
                </div>
              </button>
            </div>
          )}

          {/* SCANNING */}
          {dialogMode === "scanning" && (
            <div className="space-y-4 mt-2">
              {!imgPreview ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ScanLine className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">{t("sup.scan_instructions")}</p>
                  <div className="flex gap-3">
                    <Button onClick={() => fileRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> {t("sup.btn_upload")}
                    </Button>
                    <Button variant="outline" onClick={() => cameraRef.current?.click()}>
                      <Camera className="h-4 w-4 mr-2" /> {t("sup.btn_camera")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <img src={imgPreview} alt={t("sup.dialog_scan")} className="w-full max-h-64 object-contain rounded-lg bg-muted" />
                  {scanning && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      {t("sup.btn_scanning")}
                    </div>
                  )}
                  {scanError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{scanError}</p>}
                  <div className="flex gap-3">
                    <Button onClick={escanearEtiqueta} disabled={scanning} className="flex-1">
                      <ScanLine className="h-4 w-4 mr-2" />
                      {scanning ? t("sup.btn_scanning") : t("sup.btn_scan_action")}
                    </Button>
                    <Button variant="outline" onClick={() => { setImgPreview(null); setImgBase64(null); setScanError(""); }}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
              <Button variant="ghost" className="w-full" onClick={() => setDialogMode("choice")}>
                {t("sup.back")}
              </Button>
            </div>
          )}

          {/* FORM */}
          {dialogMode === "form" && (
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              {form.cantidad_escaneada && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-sm text-primary">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{t("sup.scan_ok")}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("sup.lbl_nombre")}</Label>
                <Input
                  placeholder={t("sup.ph_nombre")}
                  value={form.nombre_producto}
                  onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })}
                  data-testid="input-sup-nombre"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("sup.lbl_marca")}</Label>
                <Input
                  placeholder={t("sup.ph_marca")}
                  value={form.marca}
                  onChange={(e) => setForm({ ...form, marca: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("sup.lbl_cantidad")}</Label>
                <Input
                  placeholder={t("sup.ph_cantidad")}
                  value={form.cantidad_escaneada}
                  onChange={(e) => setForm({ ...form, cantidad_escaneada: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("sup.lbl_total")}</Label>
                <Input
                  type="number" min="1"
                  placeholder={t("sup.ph_total")}
                  value={form.total_unidades}
                  onChange={(e) => setForm({ ...form, total_unidades: e.target.value })}
                  data-testid="input-sup-total"
                />
                <p className="text-xs text-muted-foreground">{t("sup.total_hint")}</p>
              </div>

              <div className="space-y-2">
                <Label>{t("sup.lbl_frecuencia")}</Label>
                <Select value={form.frecuencia_diaria} onValueChange={(v) => setForm({ ...form, frecuencia_diaria: v })}>
                  <SelectTrigger data-testid="select-sup-frecuencia"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FRECUENCIAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("sup.lbl_hora")}</Label>
                <Select value={form.momento_toma} onValueChange={(v) => setForm({ ...form, momento_toma: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOMENTOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">{t("sup.lbl_activo")}</p>
                  <p className="text-xs text-muted-foreground">{t("sup.activo_desc")}</p>
                </div>
                <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
              </div>

              {formError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>
                  {t("sup.cancel")}
                </Button>
                <Button type="submit" disabled={saving} className="flex-1" data-testid="button-save-supplement">
                  {saving ? t("sup.saving") : t("sup.save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Page */}
      <div className="space-y-6">
        <header className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("sup.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("sup.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDialog("choice")} data-testid="button-scan-supplement">
              <ScanLine className="h-4 w-4 mr-2" /> {t("sup.btn_scan")}
            </Button>
            <Button onClick={() => openDialog("form")} data-testid="button-add-supplement">
              <Plus className="h-4 w-4 mr-2" /> {t("sup.btn_add")}
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map((i) => <Card key={i} className="animate-pulse h-28 bg-muted" />)}
          </div>
        ) : supplements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">{t("sup.empty_title")}</h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">{t("sup.empty_msg")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {supplements.map((sup) => {
              const dias = diasRestantes(sup);
              const fecha = fechaAgotamiento(sup, lang);
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
                      : sup.activo ? "border-primary/20 hover:shadow-md" : "opacity-55"
                  }`}
                  data-testid={`card-supplement-${sup.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          isLow && tieneTracking ? "bg-red-100 text-red-600" : sup.activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
                          isLow && tieneTracking ? "bg-red-100 text-red-700" :
                          sup.activo ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {sup.activo ? t("sup.activo") : t("sup.inactivo")}
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
                          <span>{t("sup.unidades_de", { r: sup.unidades_restantes ?? 0, t: sup.total_unidades })}</span>
                          <span>
                            {dias != null ? t("sup.dias", { n: dias }) : ""}
                            {fecha ? ` · ${t("sup.hasta", { f: fecha })}` : ""}
                          </span>
                        </div>
                        <Progress value={pct} className={`h-2 ${isLow ? "[&>div]:bg-red-500" : ""}`} />
                      </div>
                    )}

                    {/* Low stock alert */}
                    {((isLow && tieneTracking) || alerta) && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-100 border border-red-200 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                        <span>{alerta || t("sup.low_stock", { nombre: sup.nombre_producto, n: dias ?? 0 })}</span>
                      </div>
                    )}

                    {/* Expanded detail */}
                    {isExpanded && sup.activo && (
                      <div className="pt-1 border-t space-y-2">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>
                            <span className="font-medium">{t("sup.frec_lbl")}</span>{" "}
                            {FRECUENCIAS.find((f) => f.value === String(sup.frecuencia_diaria))?.label ?? sup.frecuencia_diaria}
                          </p>
                          {sup.frecuencia_diaria && (
                            <p>
                              <span className="font-medium">{t("sup.dosis_dia")}</span>{" "}
                              {FREC_POR_DIA[String(sup.frecuencia_diaria)] ?? sup.frecuencia_diaria}
                            </p>
                          )}
                        </div>
                        {tieneTracking && (
                          <Button
                            variant="outline" size="sm"
                            className="w-full border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors"
                            disabled={!!tomarLoading[sup.id] || (sup.unidades_restantes ?? 0) <= 0}
                            onClick={() => tomarDosis(sup.id)}
                            data-testid={`button-tomar-${sup.id}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {tomarLoading[sup.id]
                              ? t("sup.btn_tomando")
                              : (sup.unidades_restantes ?? 0) <= 0
                                ? t("sup.sin_unidades")
                                : t("sup.btn_tomar")}
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
