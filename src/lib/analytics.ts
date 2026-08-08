type EventProperties = Record<string, string | number | boolean | undefined>;

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

function isGtagLoaded(): boolean {
  return typeof window !== "undefined" && typeof (window as any).gtag === "function";
}

export function trackPageView(path: string) {
  if (isGtagLoaded()) {
    (window as any).gtag("config", GA_MEASUREMENT_ID, { page_path: path });
  }
}

export function trackEvent(name: string, properties?: EventProperties) {
  if (isGtagLoaded()) {
    (window as any).gtag("event", name, properties);
  }
}

export function initAnalytics() {
  if (!GA_MEASUREMENT_ID || typeof document === "undefined") return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function gtag(...args: unknown[]) {
    (window as any).dataLayer.push(args);
  };
  (window as any).gtag("js", new Date());
  (window as any).gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
  });
}
