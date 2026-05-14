import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Plan = "free" | "premium";

interface PlanContextType {
  plan: Plan;
  loadingPlan: boolean;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType>({
  plan: "free",
  loadingPlan: true,
  refreshPlan: async () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [loadingPlan, setLoadingPlan] = useState(true);

  const fetchPlan = useCallback(async (userId: string) => {
    if (!supabase) { setLoadingPlan(false); return; }
    const { data } = await supabase
      .from("usuarios")
      .select("plan")
      .eq("id", userId)
      .single();
    setPlan(data?.plan === "premium" ? "premium" : "free");
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
        setLoadingPlan(false);
      };
      upgradePlan();
      return;
    }

    fetchPlan(user.id);
  }, [user, fetchPlan]);

  return (
    <PlanContext.Provider value={{ plan, loadingPlan, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
