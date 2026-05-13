import { useState, useEffect, useRef, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  User, Activity, Heart, AlertCircle, CheckCircle,
  Camera, Scale, FileText, Upload, Plus, Trash2, ExternalLink,
  TrendingDown, TrendingUp, Minus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularIMC(pesoKg: number, alturaCm: number): number | null {
  if (!pesoKg || !alturaCm) return null;
  const alturaM = alturaCm / 100;
  return pesoKg / (alturaM * alturaM);
}

function lbsToKg(lbs: number) { return lbs * 0.453592; }
function kgToLbs(kg: number)  { return kg / 0.453592; }
function ftInToCm(ft: number, inches: number) { return (ft * 12 + inches) * 2.54; }
function cmToFtIn(cm: number) {
  const totalIn = cm / 2.54;
  return { ft: Math.floor(totalIn / 12), inches: Math.round(totalIn % 12) };
}

function formatFecha(iso: string, lang: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    day: "numeric", month: "short",
  });
}

function today() { return new Date().toISOString().split("T")[0]; }

interface Pesaje { id: string; peso: number; fecha: string; }
interface Laboratorio {
  id: string; nombre_archivo: string; archivo_url: string;
  fecha_laboratorio: string; notas: string; tipo: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Perfil() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const avatarRef = useRef<HTMLInputElement>(null);
  const labRef    = useRef<HTMLInputElement>(null);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [mensaje,  setMensaje]  = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [avatarUrl, setAvatarUrl]             = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [form, setForm] = useState({
    nombre: "", email: "", edad: "",
    pesoKg: "", alturaCm: "",
    unidadPeso: "kg", unidadAltura: "cm",
    alturaFt: "", alturaIn: "",
    objetivo: "", pesoMetaKg: "",
    nivel_actividad: "", horas_sueno: "",
    antecedentes_salud: "", restricciones_alimentarias: "",
  });

  const [pesajes, setPesajes]   = useState<Pesaje[]>([]);
  const [pesoDialog, setPesoDialog] = useState(false);
  const [nuevoPeso, setNuevoPeso]   = useState({ peso: "", fecha: today() });
  const [savingPeso, setSavingPeso] = useState(false);

  const [labs,      setLabs]      = useState<Laboratorio[]>([]);
  const [labDialog, setLabDialog] = useState(false);
  const [labForm,   setLabForm]   = useState({ fecha: today(), notas: "" });
  const [labFile,   setLabFile]   = useState<File | null>(null);
  const [savingLab, setSavingLab] = useState(false);
  const [labError,  setLabError]  = useState("");

  // Translation-aware option lists
  const OBJETIVOS = [
    { value: "perder_peso",    label: t("perf.obj_perder") },
    { value: "ganar_musculo",  label: t("perf.obj_musculo") },
    { value: "definir",        label: t("perf.obj_definir") },
    { value: "mantener",       label: t("perf.obj_mantener") },
    { value: "mejorar_salud",  label: t("perf.obj_salud") },
  ];

  const cargar = useCallback(async () => {
    if (!supabase || !user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: p } = await supabase.from("usuarios").select("*").eq("id", user.id).single();
      if (p) {
        const pesoKg      = p.peso_kg ?? "";
        const alturaCm    = p.altura_cm ?? "";
        const unidadPeso  = p.unidad_peso   ?? "kg";
        const unidadAltura= p.unidad_altura ?? "cm";
        const ftIn = alturaCm ? cmToFtIn(Number(alturaCm)) : { ft: "", inches: "" };
        setAvatarUrl(p.avatar_url ?? null);
        setForm({
          nombre: p.nombre ?? "",
          email:  p.email  ?? user.email ?? "",
          edad:   p.edad?.toString() ?? "",
          pesoKg: pesoKg ? (unidadPeso === "lbs" ? kgToLbs(Number(pesoKg)).toFixed(1) : String(pesoKg)) : "",
          alturaCm: alturaCm ? String(alturaCm) : "",
          unidadPeso, unidadAltura,
          alturaFt: ftIn.ft !== "" ? String(ftIn.ft) : "",
          alturaIn: ftIn.inches !== "" ? String(ftIn.inches) : "",
          objetivo: p.objetivo ?? "",
          pesoMetaKg: p.peso_meta_kg
            ? (unidadPeso === "lbs" ? kgToLbs(Number(p.peso_meta_kg)).toFixed(1) : String(p.peso_meta_kg))
            : "",
          nivel_actividad: p.nivel_actividad ?? "",
          horas_sueno: p.horas_sueno?.toString() ?? "",
          antecedentes_salud: p.antecedentes_salud ?? "",
          restricciones_alimentarias: Array.isArray(p.restricciones_alimentarias)
            ? p.restricciones_alimentarias.join(", ")
            : p.restricciones_alimentarias ?? "",
        });
      } else {
        setForm((f) => ({ ...f, email: user.email ?? "" }));
      }
      const { data: ps } = await supabase
        .from("pesajes").select("*").eq("usuario_id", user.id).order("fecha");
      if (ps) setPesajes(ps);
      const { data: ls } = await supabase
        .from("laboratorios").select("*").eq("usuario_id", user.id).order("fecha_laboratorio", { ascending: false });
      if (ls) setLabs(ls);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const pesoKgNum = form.pesoKg
    ? form.unidadPeso === "lbs" ? lbsToKg(Number(form.pesoKg)) : Number(form.pesoKg)
    : 0;
  const alturaCmNum = form.unidadAltura === "pies"
    ? ftInToCm(Number(form.alturaFt) || 0, Number(form.alturaIn) || 0)
    : Number(form.alturaCm) || 0;
  const imc = pesoKgNum && alturaCmNum ? calcularIMC(pesoKgNum, alturaCmNum) : null;

  function imcInfo(v: number) {
    if (v < 18.5) return { label: t("perf.imc_bajo"),      color: "text-blue-600 bg-blue-50" };
    if (v < 25)   return { label: t("perf.imc_normal"),    color: "text-green-600 bg-green-50" };
    if (v < 30)   return { label: t("perf.imc_sobrepeso"), color: "text-yellow-600 bg-yellow-50" };
    return           { label: t("perf.imc_obesidad"),      color: "text-red-600 bg-red-50" };
  }

  const pesoMetaKgNum = form.pesoMetaKg
    ? form.unidadPeso === "lbs" ? lbsToKg(Number(form.pesoMetaKg)) : Number(form.pesoMetaKg)
    : null;
  const ultimoPeso = pesajes.length > 0 ? pesajes[pesajes.length - 1].peso : null;
  const kgFaltanMeta = ultimoPeso && pesoMetaKgNum
    ? Math.abs(ultimoPeso - pesoMetaKgNum).toFixed(1)
    : null;
  const dirMetaIcon = ultimoPeso && pesoMetaKgNum
    ? ultimoPeso > pesoMetaKgNum ? TrendingDown : ultimoPeso < pesoMetaKgNum ? TrendingUp : Minus
    : null;

  const chartData = pesajes.map((p) => ({
    fecha: formatFecha(p.fecha, lang),
    peso: form.unidadPeso === "lbs" ? parseFloat(kgToLbs(p.peso).toFixed(1)) : p.peso,
  }));
  const pesoMetaChart = pesoMetaKgNum
    ? (form.unidadPeso === "lbs" ? parseFloat(kgToLbs(pesoMetaKgNum).toFixed(1)) : pesoMetaKgNum)
    : null;
  const pesosValues = chartData.map((d) => d.peso);
  const yMin = pesosValues.length ? Math.floor(Math.min(...pesosValues, pesoMetaChart ?? Infinity) - 3) : undefined;
  const yMax = pesosValues.length ? Math.ceil(Math.max(...pesosValues, pesoMetaChart ?? -Infinity) + 3) : undefined;
  const unidadPesoLabel = form.unidadPeso === "lbs" ? "lbs" : "kg";

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function guardarPerfil() {
    if (!supabase || !user) return;
    setSaving(true);
    setMensaje(null);
    try {
      const restriccionesArray = form.restricciones_alimentarias.split(",").map((r) => r.trim()).filter(Boolean);
      const payload: Record<string, unknown> = {
        id: user.id, email: user.email,
        nombre: form.nombre,
        edad: form.edad ? parseInt(form.edad) : null,
        peso_kg: pesoKgNum || null,
        altura_cm: alturaCmNum || null,
        unidad_peso: form.unidadPeso,
        unidad_altura: form.unidadAltura,
        objetivo: form.objetivo || null,
        peso_meta_kg: pesoMetaKgNum || null,
        nivel_actividad: form.nivel_actividad || null,
        horas_sueno: form.horas_sueno ? parseFloat(form.horas_sueno) : null,
        antecedentes_salud: form.antecedentes_salud || null,
        restricciones_alimentarias: restriccionesArray,
        avatar_url: avatarUrl,
      };
      const { error } = await supabase.from("usuarios").upsert(payload, { onConflict: "id" });
      if (error) {
        setMensaje({ tipo: "error", texto: t("perf.err_save", { e: error.message }) });
      } else {
        setMensaje({ tipo: "exito", texto: t("perf.success") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !user) return;
    setAvatarUploading(true);
    try {
      const path = `${user.id}/avatar`;
      const { error } = await supabase.storage.from("avatares").upload(path, file, { upsert: true, contentType: file.type });
      if (error) { setMensaje({ tipo: "error", texto: t("perf.err_avatar", { e: error.message }) }); return; }
      const { data: urlData } = supabase.storage.from("avatares").getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  async function registrarPeso(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !nuevoPeso.peso) return;
    setSavingPeso(true);
    try {
      const pesoEnKg = form.unidadPeso === "lbs" ? lbsToKg(Number(nuevoPeso.peso)) : Number(nuevoPeso.peso);
      const { error } = await supabase.from("pesajes").insert({
        usuario_id: user.id, peso: parseFloat(pesoEnKg.toFixed(2)), fecha: nuevoPeso.fecha,
      });
      if (error) { alert("Error: " + error.message); return; }
      setPesoDialog(false);
      setNuevoPeso({ peso: "", fecha: today() });
      await cargar();
    } finally {
      setSavingPeso(false);
    }
  }

  async function eliminarPesaje(id: string) {
    if (!supabase || !user) return;
    await supabase.from("pesajes").delete().eq("id", id).eq("usuario_id", user.id);
    setPesajes((p) => p.filter((x) => x.id !== id));
  }

  async function subirLaboratorio(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !labFile) { setLabError(t("perf.err_no_file")); return; }
    setSavingLab(true);
    setLabError("");
    try {
      const ext = labFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("laboratorios").upload(path, labFile, { contentType: labFile.type });
      if (upErr) { setLabError(t("perf.err_upload", { e: upErr.message })); return; }
      const { data: urlData } = supabase.storage.from("laboratorios").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("laboratorios").insert({
        usuario_id: user.id, nombre_archivo: labFile.name, archivo_url: urlData.publicUrl,
        fecha_laboratorio: labForm.fecha, notas: labForm.notas || null, tipo: labFile.type,
      });
      if (dbErr) { setLabError(t("perf.err_db", { e: dbErr.message })); return; }
      setLabDialog(false);
      setLabFile(null);
      setLabForm({ fecha: today(), notas: "" });
      await cargar();
    } finally {
      setSavingLab(false);
    }
  }

  async function eliminarLab(lab: Laboratorio) {
    if (!supabase || !user) return;
    const path = lab.archivo_url.split("/laboratorios/")[1];
    if (path) await supabase.storage.from("laboratorios").remove([path]);
    await supabase.from("laboratorios").delete().eq("id", lab.id).eq("usuario_id", user.id);
    setLabs((l) => l.filter((x) => x.id !== lab.id));
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <Layout>
      <div className="space-y-4 max-w-3xl">
        {[1,2,3].map((i) => <Card key={i} className="animate-pulse h-40 bg-muted" />)}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <input ref={labRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => { setLabFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />

      {/* Weight dialog */}
      <Dialog open={pesoDialog} onOpenChange={setPesoDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("perf.dialog_peso")}</DialogTitle></DialogHeader>
          <form onSubmit={registrarPeso} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t("perf.lbl_peso_u", { u: unidadPesoLabel })}</Label>
              <Input type="number" step="0.1" min="1"
                placeholder={form.unidadPeso === "lbs" ? t("perf.ph_peso_es") : t("perf.ph_peso_kg")}
                value={nuevoPeso.peso}
                onChange={(e) => setNuevoPeso((p) => ({ ...p, peso: e.target.value }))}
                required />
            </div>
            <div className="space-y-2">
              <Label>{t("perf.lbl_fecha")}</Label>
              <Input type="date" value={nuevoPeso.fecha} max={today()}
                onChange={(e) => setNuevoPeso((p) => ({ ...p, fecha: e.target.value }))} required />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPesoDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={savingPeso} className="flex-1">
                {savingPeso ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lab dialog */}
      <Dialog open={labDialog} onOpenChange={(v) => { setLabDialog(v); if (!v) { setLabFile(null); setLabError(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("perf.lab_dialog")}</DialogTitle></DialogHeader>
          <form onSubmit={subirLaboratorio} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t("perf.lbl_archivo")}</Label>
              {labFile ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate flex-1">{labFile.name}</span>
                  <button type="button" onClick={() => setLabFile(null)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full" onClick={() => labRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> {t("perf.btn_select")}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("perf.lbl_fecha_lab")}</Label>
              <Input type="date" value={labForm.fecha} max={today()}
                onChange={(e) => setLabForm((f) => ({ ...f, fecha: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>{t("perf.lbl_notas")}</Label>
              <textarea
                value={labForm.notas}
                onChange={(e) => setLabForm((f) => ({ ...f, notas: e.target.value }))}
                placeholder={t("perf.ph_notas")}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[72px] resize-none"
              />
            </div>
            {labError && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{labError}</p>}
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setLabDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={savingLab} className="flex-1">
                {savingLab ? t("perf.btn_uploading") : t("perf.btn_upload_lab")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Page */}
      <div className="space-y-6 max-w-3xl">
        <header>
          <h1 className="text-3xl font-bold">{t("perf.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("perf.subtitle")}</p>
        </header>

        {mensaje && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
            mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
          }`}>
            {mensaje.tipo === "exito" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {mensaje.texto}
          </div>
        )}

        {/* Avatar + basic info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    : <User className="h-10 w-10 text-primary/60" />}
                </div>
                <button
                  onClick={() => avatarRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-2">
                  <Label>{t("perf.lbl_nombre")}</Label>
                  <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("perf.lbl_correo")}</Label>
                  <Input value={form.email} disabled className="bg-muted cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <Label>{t("perf.lbl_edad")}</Label>
                  <Input type="number" placeholder="32" value={form.edad}
                    onChange={(e) => setForm((f) => ({ ...f, edad: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("perf.lbl_sueno")}</Label>
                  <Input type="number" step="0.5" placeholder="7.5" value={form.horas_sueno}
                    onChange={(e) => setForm((f) => ({ ...f, horas_sueno: e.target.value }))} />
                </div>
              </div>
            </div>
            {avatarUploading && <p className="text-xs text-muted-foreground mt-3 text-center">{t("perf.avatar_uploading")}</p>}
          </CardContent>
        </Card>

        {/* Physical data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> {t("perf.datos_fisicos")}
            </CardTitle>
            <CardDescription>{t("perf.datos_fisicos_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Weight + unit toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("perf.lbl_peso")}</Label>
                  <div className="flex rounded-md border text-xs overflow-hidden">
                    {["kg","lbs"].map((u) => (
                      <button key={u} type="button"
                        className={`px-2.5 py-1 transition-colors ${form.unidadPeso === u ? "bg-primary text-white" : "hover:bg-muted"}`}
                        onClick={() => {
                          if (form.unidadPeso === u) return;
                          const pesoNum = Number(form.pesoKg);
                          const metaNum = Number(form.pesoMetaKg);
                          setForm((f) => ({
                            ...f, unidadPeso: u,
                            pesoKg: pesoNum ? (u === "lbs" ? kgToLbs(pesoNum).toFixed(1) : lbsToKg(pesoNum).toFixed(1)) : f.pesoKg,
                            pesoMetaKg: metaNum ? (u === "lbs" ? kgToLbs(metaNum).toFixed(1) : lbsToKg(metaNum).toFixed(1)) : f.pesoMetaKg,
                          }));
                        }}
                      >{u}</button>
                    ))}
                  </div>
                </div>
                <Input type="number" step="0.1" min="1"
                  placeholder={form.unidadPeso === "lbs" ? t("perf.ph_peso_es") : t("perf.ph_peso_kg")}
                  value={form.pesoKg}
                  onChange={(e) => setForm((f) => ({ ...f, pesoKg: e.target.value }))} />
              </div>

              {/* Height + unit toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("perf.lbl_altura")}</Label>
                  <div className="flex rounded-md border text-xs overflow-hidden">
                    {["cm","pies"].map((u) => (
                      <button key={u} type="button"
                        className={`px-2.5 py-1 transition-colors ${form.unidadAltura === u ? "bg-primary text-white" : "hover:bg-muted"}`}
                        onClick={() => {
                          if (form.unidadAltura === u) return;
                          if (u === "pies" && form.alturaCm) {
                            const fi = cmToFtIn(Number(form.alturaCm));
                            setForm((f) => ({ ...f, unidadAltura: "pies", alturaFt: String(fi.ft), alturaIn: String(fi.inches) }));
                          } else if (u === "cm" && (form.alturaFt || form.alturaIn)) {
                            const cm = ftInToCm(Number(form.alturaFt)||0, Number(form.alturaIn)||0);
                            setForm((f) => ({ ...f, unidadAltura: "cm", alturaCm: cm.toFixed(0) }));
                          } else {
                            setForm((f) => ({ ...f, unidadAltura: u }));
                          }
                        }}
                      >{u === "cm" ? "cm" : "ft/in"}</button>
                    ))}
                  </div>
                </div>
                {form.unidadAltura === "cm" ? (
                  <Input type="number" placeholder="170" value={form.alturaCm}
                    onChange={(e) => setForm((f) => ({ ...f, alturaCm: e.target.value }))} />
                ) : (
                  <div className="flex gap-2">
                    <Input type="number" placeholder={t("perf.pies")} min="1" max="8" value={form.alturaFt}
                      onChange={(e) => setForm((f) => ({ ...f, alturaFt: e.target.value }))} className="w-1/2" />
                    <Input type="number" placeholder={t("perf.pulgadas")} min="0" max="11" value={form.alturaIn}
                      onChange={(e) => setForm((f) => ({ ...f, alturaIn: e.target.value }))} className="w-1/2" />
                  </div>
                )}
              </div>
            </div>

            {/* BMI */}
            {imc && (() => { const info = imcInfo(imc); return (
              <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${info.color}`}>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70">{t("perf.imc")}</p>
                  <p className="text-2xl font-bold">{imc.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{info.label}</p>
                  <p className="text-xs opacity-70">{t("perf.imc_range")}</p>
                </div>
              </div>
            ); })()}

            {/* Goal + target weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("perf.lbl_objetivo")}</Label>
                <Select value={form.objetivo} onValueChange={(v) => setForm((f) => ({ ...f, objetivo: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("perf.sel_objetivo")} /></SelectTrigger>
                  <SelectContent>
                    {OBJETIVOS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("perf.lbl_peso_meta", { u: unidadPesoLabel })}</Label>
                <Input type="number" step="0.1" min="1" value={form.pesoMetaKg}
                  onChange={(e) => setForm((f) => ({ ...f, pesoMetaKg: e.target.value }))} />
              </div>
            </div>

            {/* Activity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("perf.lbl_actividad")}</Label>
                <Select value={form.nivel_actividad} onValueChange={(v) => setForm((f) => ({ ...f, nivel_actividad: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("perf.sel_actividad")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentario">{t("perf.act_sedentario")}</SelectItem>
                    <SelectItem value="ligero">{t("perf.act_ligero")}</SelectItem>
                    <SelectItem value="moderado">{t("perf.act_moderado")}</SelectItem>
                    <SelectItem value="activo">{t("perf.act_activo")}</SelectItem>
                    <SelectItem value="muy_activo">{t("perf.act_muy")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("perf.lbl_antecedentes")}</Label>
              <textarea value={form.antecedentes_salud}
                onChange={(e) => setForm((f) => ({ ...f, antecedentes_salud: e.target.value }))}
                placeholder={t("perf.ph_antecedentes")}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[72px] resize-none" />
            </div>
            <div className="space-y-2">
              <Label>{t("perf.lbl_restricciones")}</Label>
              <Input placeholder={t("perf.ph_restricciones")} value={form.restricciones_alimentarias}
                onChange={(e) => setForm((f) => ({ ...f, restricciones_alimentarias: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        {/* Weight evolution */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" /> {t("perf.evolucion_title")}
                </CardTitle>
                <CardDescription>{t("perf.evolucion_desc")}</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setNuevoPeso({ peso: "", fecha: today() }); setPesoDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> {t("perf.btn_registrar")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {kgFaltanMeta && dirMetaIcon && pesoMetaKgNum && (() => {
              const Icon = dirMetaIcon;
              const metaDisplay = form.unidadPeso === "lbs" ? kgToLbs(pesoMetaKgNum).toFixed(1) : pesoMetaKgNum.toFixed(1);
              return (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {t("perf.meta_faltan", { kg: kgFaltanMeta, u: unidadPesoLabel, meta: metaDisplay })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("perf.ultimo")} {ultimoPeso
                        ? `${form.unidadPeso === "lbs" ? kgToLbs(ultimoPeso).toFixed(1) : ultimoPeso} ${unidadPesoLabel}`
                        : "—"}
                    </p>
                  </div>
                </div>
              );
            })()}

            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={yMin !== undefined && yMax !== undefined ? [yMin, yMax] : undefined} unit={` ${unidadPesoLabel}`} width={60} />
                  <Tooltip formatter={(v) => [`${v} ${unidadPesoLabel}`, t("perf.lbl_peso")]} />
                  <Legend />
                  <Line
                    type="monotone" dataKey="peso"
                    name={t("perf.chart_label", { u: unidadPesoLabel })}
                    stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: "#22c55e" }} activeDot={{ r: 6 }}
                  />
                  {pesoMetaChart != null && (
                    <ReferenceLine
                      y={pesoMetaChart} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={2}
                      label={{ value: t("perf.chart_meta", { m: pesoMetaChart, u: unidadPesoLabel }), position: "insideTopRight", fontSize: 11, fill: "#f59e0b" }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : chartData.length === 1 ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-lg text-sm text-muted-foreground">
                {t("perf.need_more")}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Scale className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">{t("perf.empty_pesajes")}</p>
              </div>
            )}

            {pesajes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("perf.historial")}</p>
                <div className="divide-y rounded-lg border overflow-hidden">
                  {[...pesajes].reverse().slice(0, 10).map((p) => {
                    const display = form.unidadPeso === "lbs" ? kgToLbs(p.peso).toFixed(1) : p.peso;
                    return (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm bg-background hover:bg-muted/30">
                        <span className="text-muted-foreground">{formatFecha(p.fecha, lang)}</span>
                        <span className="font-medium">{display} {unidadPesoLabel}</span>
                        <button onClick={() => eliminarPesaje(p.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Labs */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" /> {t("perf.labs_title")}
                </CardTitle>
                <CardDescription>{t("perf.labs_desc")}</CardDescription>
              </div>
              <Button size="sm" variant="outline"
                onClick={() => { setLabForm({ fecha: today(), notas: "" }); setLabFile(null); setLabError(""); setLabDialog(true); }}>
                <Upload className="h-4 w-4 mr-1" /> {t("perf.btn_subir")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {labs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">{t("perf.empty_labs")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labs.map((lab) => {
                  const esImagen = lab.tipo?.startsWith("image/");
                  return (
                    <div key={lab.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                      {esImagen
                        ? <img src={lab.archivo_url} alt={lab.nombre_archivo} className="h-12 w-12 object-cover rounded-md border shrink-0" />
                        : <div className="h-12 w-12 rounded-md border bg-primary/5 flex items-center justify-center shrink-0"><FileText className="h-6 w-6 text-primary" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lab.nombre_archivo}</p>
                        <p className="text-xs text-muted-foreground">{formatFecha(lab.fecha_laboratorio, lang)}</p>
                        {lab.notas && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lab.notas}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={lab.archivo_url} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button onClick={() => eliminarLab(lab)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={guardarPerfil} disabled={saving} className="w-full md:w-auto">
          {saving ? t("perf.btn_saving") : t("perf.btn_save")}
        </Button>
      </div>
    </Layout>
  );
}
