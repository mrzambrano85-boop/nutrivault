import { Layout } from "@/components/layout/Layout";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, ScanLine, Check, RotateCcw, AlertCircle } from "lucide-react";

interface Ingrediente {
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string;
}

type Estado = "idle" | "previewing" | "scanning" | "resultado" | "guardando" | "guardado" | "error";

export default function Tickets() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [estado, setEstado] = useState<Estado>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("El archivo debe ser una imagen (JPEG, PNG o WebP).");
      setEstado("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // dataUrl = "data:image/jpeg;base64,XXXXX"
      const [header, b64] = dataUrl.split(",");
      const mime = header.replace("data:", "").replace(";base64", "");
      setImagePreview(dataUrl);
      setImageBase64(b64);
      setMimeType(mime);
      setEstado("previewing");
    };
    reader.readAsDataURL(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  async function escanear() {
    if (!imageBase64) return;
    setEstado("scanning");
    setErrorMsg("");
    try {
      const res = await fetch("/api/scan-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al escanear el ticket.");
      setIngredientes(data.ingredientes ?? []);
      setEstado("resultado");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido al escanear.");
      setEstado("error");
    }
  }

  async function guardarEnDespensa() {
    if (!supabase || !user || ingredientes.length === 0) return;
    setEstado("guardando");
    try {
      const rows = ingredientes.map((ing) => ({
        nombre: ing.nombre,
        cantidad: ing.cantidad,
        unidad: ing.unidad,
        categoria: ing.categoria,
        usuario_id: user.id,
      }));
      const { error } = await supabase.from("ingredientes").insert(rows);
      if (error) throw new Error(error.message);
      setEstado("guardado");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar en despensa.");
      setEstado("error");
    }
  }

  function reiniciar() {
    setEstado("idle");
    setImagePreview(null);
    setImageBase64(null);
    setIngredientes([]);
    setErrorMsg("");
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Escanear Ticket</h1>
          <p className="text-muted-foreground mt-1">
            Sube la foto de tu ticket del supermercado y añade los productos a tu despensa automáticamente.
          </p>
        </header>

        {/* Hidden file inputs */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} data-testid="input-file-ticket" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} data-testid="input-camera-ticket" />

        {/* IDLE — upload prompt */}
        {estado === "idle" && (
          <Card className="border-dashed border-2 border-primary/30 hover:border-primary/60 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center gap-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ScanLine className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sube tu ticket de compra</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Claude analizará la imagen y extraerá los productos alimenticios automáticamente.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button onClick={() => fileRef.current?.click()} data-testid="button-upload-image">
                  <Upload className="h-4 w-4 mr-2" /> Subir imagen
                </Button>
                <Button variant="outline" onClick={() => cameraRef.current?.click()} data-testid="button-open-camera">
                  <Camera className="h-4 w-4 mr-2" /> Tomar foto
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PREVIEWING — show image before scanning */}
        {(estado === "previewing" || estado === "scanning") && imagePreview && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <img
                  src={imagePreview}
                  alt="Vista previa del ticket"
                  className="w-full max-h-96 object-contain rounded-md bg-muted"
                  data-testid="img-ticket-preview"
                />
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button
                onClick={escanear}
                disabled={estado === "scanning"}
                className="flex-1"
                data-testid="button-scan-ticket"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                {estado === "scanning" ? "Analizando con Claude..." : "Escanear ticket"}
              </Button>
              <Button variant="outline" onClick={reiniciar} disabled={estado === "scanning"}>
                <RotateCcw className="h-4 w-4 mr-2" /> Cambiar imagen
              </Button>
            </div>
            {estado === "scanning" && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-sm text-primary font-medium">
                    Claude está analizando tu ticket... esto puede tomar unos segundos.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* RESULTADO — show extracted ingredients */}
        {(estado === "resultado" || estado === "guardando") && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">
                    Productos encontrados ({ingredientes.length})
                  </h2>
                  <Button variant="ghost" size="sm" onClick={reiniciar}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Nuevo ticket
                  </Button>
                </div>

                {ingredientes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No se detectaron productos alimenticios en la imagen. Intenta con una foto más nítida.
                  </p>
                ) : (
                  <div className="divide-y">
                    {ingredientes.map((ing, i) => (
                      <div key={i} className="py-3 flex items-center justify-between" data-testid={`row-ingredient-${i}`}>
                        <div>
                          <p className="font-medium">{ing.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {ing.cantidad} {ing.unidad}
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {ing.categoria}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {ingredientes.length > 0 && (
                  <Button
                    onClick={guardarEnDespensa}
                    disabled={estado === "guardando"}
                    className="w-full"
                    data-testid="button-save-to-despensa"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {estado === "guardando"
                      ? "Guardando en despensa..."
                      : `Guardar ${ingredientes.length} productos en despensa`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* GUARDADO — success */}
        {estado === "guardado" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Productos guardados</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {ingredientes.length} producto{ingredientes.length !== 1 ? "s" : ""} añadido{ingredientes.length !== 1 ? "s" : ""} a tu despensa correctamente.
                </p>
              </div>
              <Button onClick={reiniciar} variant="outline" data-testid="button-scan-another">
                Escanear otro ticket
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ERROR */}
        {estado === "error" && (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center gap-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Algo salió mal</h3>
                <p className="text-muted-foreground mt-1 text-sm">{errorMsg}</p>
              </div>
              <Button onClick={reiniciar} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" /> Intentar de nuevo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
