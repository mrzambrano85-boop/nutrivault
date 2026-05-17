import { useState, cloneElement, isValidElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Lock } from "lucide-react";
import { usePlan } from "@/context/PlanContext";
import { useAuth } from "@/context/AuthContext";

const FREE_FEATURES = [
  "Panel de control",
  "Despensa e ingredientes",
  "Recetas guardadas",
  "Registro de suplementos (manual)",
  "Seguimiento de puntos",
];

const PREMIUM_FEATURES = [
  "Todo lo del plan gratis",
  "Escanear etiquetas con IA",
  "Generar plan de dieta con IA",
  "Historial avanzado de pesajes",
  "Soporte prioritario",
];

interface PremiumGateProps {
  children: React.ReactElement;
}

export function PremiumGate({ children }: PremiumGateProps) {
  const { plan, loadingPlan } = usePlan();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [stripeError, setStripeError] = useState("");

  if (loadingPlan) return children;
  if (plan === "premium") return children;

  async function handleUpgrade() {
    setStripeError("");
    setRedirecting(true);
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
      | string
      | undefined;
    const priceId = import.meta.env.VITE_STRIPE_PRICE_ID as string | undefined;
    if (!pk || !priceId) {
      setStripeError(
        "Configuración de pago no disponible. Contacta al soporte.",
      );
      setRedirecting(false);
      return;
    }
    const stripeJs = (window as any).Stripe;
    if (!stripeJs) {
      setStripeError(
        "No se pudo cargar el sistema de pagos. Recarga la página.",
      );
      setRedirecting(false);
      return;
    }
    const stripe = stripeJs(pk);
    const base = import.meta.env.BASE_URL as string;
    const origin = window.location.origin;
    const successUrl = `${origin}${base.replace(/\/$/, "")}/?payment=success`;
    const cancelUrl = window.location.href;
    const { error } = await stripe.redirectToCheckout({
      lineItems: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      successUrl,
      cancelUrl,
      customerEmail: user?.email,
    });
    if (error) {
      setStripeError(error.message ?? "Error al redirigir al pago.");
      setRedirecting(false);
    }
  }

  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<any>, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        },
      })
    : children;

  return (
    <>
      <span className="relative inline-flex w-full">
        {trigger}
        <Lock className="absolute top-3 right-3 h-4 w-4 text-amber-500 pointer-events-none" />
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-amber-500" />
              NutriVault Premium
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="rounded-xl border p-4 bg-muted/30">
              <p className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                Gratis
              </p>
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-bold text-lg">$0</p>
            </div>
            <div className="rounded-xl border-2 border-primary p-4 bg-primary/5 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                Recomendado
              </span>
              <p className="font-semibold text-sm text-primary mb-3 uppercase tracking-wide">
                Premium
              </p>
              <ul className="space-y-2">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-bold text-lg">
                $9.99{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  /mes
                </span>
              </p>
            </div>
          </div>

          {stripeError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {stripeError}
            </p>
          )}
          <div className="flex flex-col gap-2 mt-2">
            <Button
              className="w-full gap-2"
              onClick={handleUpgrade}
              disabled={redirecting}
            >
              <Sparkles className="h-4 w-4" />
              {redirecting ? "Redirigiendo..." : "Activar Premium — $9.99/mes"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Continuar con plan gratis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
