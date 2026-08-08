const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export function reportError(error: Error | unknown, context?: ErrorContext) {
  const err = error instanceof Error ? error : new Error(String(error));

  console.error("[InsightPM Error]", err.message, context);

  if (SENTRY_DSN && typeof (window as any).Sentry?.captureException === "function") {
    (window as any).Sentry.captureException(err, {
      tags: {
        component: context?.component,
        action: context?.action,
      },
      user: context?.userId ? { id: context.userId } : undefined,
      extra: context?.extra,
    });
  }
}

export function initErrorReporting() {
  if (!SENTRY_DSN || typeof document === "undefined") return;

  const script = document.createElement("script");
  script.src = "https://browser.sentry-cdn.com/8.0.0/bundle.tracing.min.js";
  script.crossOrigin = "anonymous";
  script.onload = () => {
    if (typeof (window as any).Sentry?.init === "function") {
      (window as any).Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: import.meta.env.MODE,
      });
    }
  };
  document.head.appendChild(script);

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { action: "unhandledrejection" });
  });

  window.addEventListener("error", (event) => {
    reportError(event.error || event.message, { action: "uncaught_error" });
  });
}
