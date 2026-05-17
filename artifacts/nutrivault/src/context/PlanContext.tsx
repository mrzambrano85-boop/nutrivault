import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Plan = "free" | "trial" | "premium";

interface PlanContextType {
  plan: Plan;
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  loadingPlan: boolean;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType>({
  plan: "free",
  isPremium: false,
  isTrialActive: false,
  trialDaysLeft: 0,
  loadingPlan: true,
  refreshPlan: async () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const fetchPlan = useCallback(async (userId: string) => {
    if (!supabase) { setLoadingPlan(false); return; }
    const { data } = await supabase
      .from("usuarios")
      .select("plan, plan_expira_en")
      .eq("id", userId)
      .single();

    if (!data) { setLoadingPlan(false); return; }

    const rawPlan = data.plan as string;

    if (rawPlan === "premium") {
      setPlan("premium");
      setTrialDaysLeft(0);
    } else if (rawPlan === "trial" && data.plan_expira_en) {
      const expira = new Date(data.plan_expira_en);
      const ahora = new Date();
      const diffMs = expira.getTime() - ahora.getTime();
      const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (diasRestantes > 0) {
        setPlan("trial");
        setTrialDaysLeft(diasRestantes);
      } else {
        setPlan("free");
        setTrialDaysLeft(0);
      }
    } else {
      setPlan("free");
      setTrialDaysLeft(0);
    }

    setLoadingPlan(false);
  }, []);

  const refreshPlan = useCallback(async () => {
    if (!user) return;
    await fetchPlan(user.id);
  }, [user, fetchPlan]);

  useEffect(() => {
    if (!user) { setLoadingPlan(false); return; }

    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      const upgradePlan = async () => {
        if (!supabase) return;
        await supabase
          .from("usuarios")
          .update({ plan: "premium" })
          .eq("id", user.id);
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        window.history.replaceState({}, "", url.toString());
        setPlan("premium");
        setTrialDaysLeft(0);
        setLoadingPlan(false);
      };
      upgradePlan();
      return;
    }

    fetchPlan(user.id);
  }, [user, fetchPlan]);

  const isPremium = plan === "premium" || plan === "trial";
  const isTrialActive = plan === "trial";

  return (
    <PlanContext.Provider value={{ plan, isPremium, isTrialActive, trialDaysLeft, loadingPlan, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}