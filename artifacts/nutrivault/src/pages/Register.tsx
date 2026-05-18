import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Mail, Lock, User } from "lucide-react";
import { Link } from "wouter";

export default function Register() {
  const [, setLocation] = useLocation();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError("");
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (!data.user) {
        setError("No se pudo crear la cuenta. Intenta de nuevo.");
        return;
      }

      if (data.session) {
        await Promise.allSettled([
          supabase.from("usuarios").upsert({ id: data.user.id, nombre, email }),
          supabase.from("profiles").upsert({
            id: data.user.id,
            name: nombre,
            email,
            plan: "trial",
            trial_start: new Date().toISOString(),
          }),
        ]);
      }

      setSuccess(true);

      if (data.session) {
        setTimeout(() => setLocation("/"), 1500);
      }
    } catch (err) {
      setError("Error inesperado. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
            <Leaf className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">NutriVault</h1>
            <p className="text-muted-foreground mt-1">Tu coach de nutrición personal</p>
          </div>
        </div>

        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Crear cuenta</CardTitle>
            <CardDescription>Regístrate para comenzar</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-6 space-y-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Leaf className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">Cuenta creada exitosamente</p>
                <p className="text-sm text-muted-foreground">
                  {`Revisa tu correo ${email} para confirmar tu cuenta.`}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Tu nombre"
                      className="pl-9"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      data-testid="input-nombre"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@correo.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      data-testid="input-password"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md" data-testid="text-error">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-register"
                >
                  {loading ? "Creando cuenta..." : "Crear cuenta"}
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login">
                <span className="text-primary font-medium hover:underline cursor-pointer" data-testid="link-login">
                  Inicia sesión
                </span>
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
