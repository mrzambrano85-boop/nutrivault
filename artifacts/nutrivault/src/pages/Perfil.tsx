import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Activity,
  Moon,
  Heart,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Perfil() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    edad: "",
    peso_kg: "",
    altura_cm: "",
    objetivo: "",
    nivel_actividad: "",
    horas_sueno: "",
    antecedentes_salud: "",
    restricciones_alimentarias: "",
  });

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setForm({
        nombre: data.nombre || "",
        email: data.email || user.email || "",
        edad: data.edad?.toString() || "",
        peso_kg: data.peso_kg?.toString() || "",
        altura_cm: data.altura_cm?.toString() || "",
        objetivo: data.objetivo || "",
        nivel_actividad: data.nivel_actividad || "",
        horas_sueno: data.horas_sueno?.toString() || "",
        antecedentes_salud: data.antecedentes_salud || "",
        restricciones_alimentarias: Array.isArray(
          data.restricciones_alimentarias,
        )
          ? data.restricciones_alimentarias.join(", ")
          : data.restricciones_alimentarias || "",
      });
    } else {
      setForm((prev) => ({ ...prev, email: user.email || "" }));
    }
    setLoading(false);
  }

  async function guardarPerfil() {
    setSaving(true);
    setMensaje(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const restriccionesArray = form.restricciones_alimentarias
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const payload = {
      id: user.id,
      email: form.email,
      nombre: form.nombre,
      edad: form.edad ? parseInt(form.edad) : null,
      peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
      altura_cm: form.altura_cm ? parseFloat(form.altura_cm) : null,
      objetivo: form.objetivo,
      nivel_actividad: form.nivel_actividad,
      horas_sueno: form.horas_sueno ? parseFloat(form.horas_sueno) : null,
      antecedentes_salud: form.antecedentes_salud,
      restricciones_alimentarias: restriccionesArray,
    };

    const { error } = await supabase
      .from("usuarios")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      setMensaje({
        tipo: "error",
        texto: "Error al guardar: " + error.message,
      });
    } else {
      setMensaje({ tipo: "exito", texto: "Perfil guardado correctamente." });
    }
    setSaving(false);
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  if (loading)
    return (
      <Layout>
        <p className="text-muted-foreground p-6">Cargando perfil...</p>
      </Layout>
    );

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Completa tu información para recibir recomendaciones personalizadas.
          </p>
        </header>

        {mensaje && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${mensaje.tipo === "exito" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
          >
            {mensaje.tipo === "exito" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {mensaje.texto}
          </div>
        )}

        <div className="grid gap-6">
          {/* Datos personales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" /> Datos Personales
              </CardTitle>
              <CardDescription>
                Información básica de tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edad">Edad</Label>
                <Input
                  id="edad"
                  type="number"
                  value={form.edad}
                  onChange={handleChange}
                  placeholder="Ej: 32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horas_sueno">Horas de sueño por noche</Label>
                <Input
                  id="horas_sueno"
                  type="number"
                  step="0.5"
                  value={form.horas_sueno}
                  onChange={handleChange}
                  placeholder="Ej: 7.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Datos físicos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" /> Datos Físicos y
                Objetivo
              </CardTitle>
              <CardDescription>
                Para calcular tus necesidades nutricionales.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="peso_kg">Peso (kg)</Label>
                <Input
                  id="peso_kg"
                  type="number"
                  step="0.1"
                  value={form.peso_kg}
                  onChange={handleChange}
                  placeholder="Ej: 70.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura_cm">Altura (cm)</Label>
                <Input
                  id="altura_cm"
                  type="number"
                  value={form.altura_cm}
                  onChange={handleChange}
                  placeholder="Ej: 170"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo principal</Label>
                <select
                  id="objetivo"
                  value={form.objetivo}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Selecciona...</option>
                  <option value="perder_peso">Perder peso</option>
                  <option value="ganar_musculo">Ganar músculo</option>
                  <option value="mantener">Mantener peso</option>
                  <option value="mejorar_salud">Mejorar salud general</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel_actividad">Nivel de actividad</Label>
                <select
                  id="nivel_actividad"
                  value={form.nivel_actividad}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Selecciona...</option>
                  <option value="sedentario">Sedentario</option>
                  <option value="ligero">Ligero (1-3 días/semana)</option>
                  <option value="moderado">Moderado (3-5 días/semana)</option>
                  <option value="activo">Activo (6-7 días/semana)</option>
                  <option value="muy_activo">Muy activo (atleta)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Salud */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-green-600" /> Salud y
                Restricciones
              </CardTitle>
              <CardDescription>
                Para personalizar tus recomendaciones de recetas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="antecedentes_salud">
                  Antecedentes de salud
                </Label>
                <textarea
                  id="antecedentes_salud"
                  value={form.antecedentes_salud}
                  onChange={handleChange}
                  placeholder="Ej: diabetes tipo 2, hipertensión, colesterol alto..."
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restricciones_alimentarias">
                  Restricciones alimentarias
                </Label>
                <Input
                  id="restricciones_alimentarias"
                  value={form.restricciones_alimentarias}
                  onChange={handleChange}
                  placeholder="Ej: gluten, lactosa, mariscos (separados por coma)"
                />
                <p className="text-xs text-muted-foreground">
                  Separa múltiples restricciones con comas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={guardarPerfil}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
          >
            {saving ? "Guardando..." : "Guardar Perfil"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
