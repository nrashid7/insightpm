import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SourceCapability { id: string; available: boolean; reason?: string }
export interface ProductCapabilities {
  billingEnabled: boolean;
  analysisMode: "evidence" | "ai";
  feedbackSources: SourceCapability[];
  marketSources: SourceCapability[];
  auth: { google: boolean; github: boolean };
}

const fallback: ProductCapabilities = {
  billingEnabled: false, analysisMode: "evidence",
  feedbackSources: [{ id: "custom", available: true }], marketSources: [],
  auth: { google: false, github: false },
};

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error: requestError } = await supabase.functions.invoke("product-capabilities");
        if (requestError || !Array.isArray(data?.feedbackSources) || !Array.isArray(data?.marketSources)) throw new Error("Source availability could not be checked. You can still paste feedback.");
        if (active) setCapabilities({ ...fallback, ...data, auth: { ...fallback.auth, ...data.auth } });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not check source availability.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);
  return { capabilities, loading, error };
}
