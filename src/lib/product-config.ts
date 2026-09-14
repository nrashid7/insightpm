export const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === "true";

export const BETA_LIMITS = {
  analysesPerMonth: 5,
  maxMonitoredProducts: 5,
  allowedFeedbackSources: "*" as const,
  allowMarketSignals: true,
  label: "Beta",
};
