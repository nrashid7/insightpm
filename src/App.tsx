import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { trackPageView } from "@/lib/analytics";

const Index = lazy(() => import("./pages/Index"));
const Analyze = lazy(() => import("./pages/Analyze"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const History = lazy(() => import("./pages/History"));
const Monitor = lazy(() => import("./pages/Monitor"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Share = lazy(() => import("./pages/Share"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <Suspense fallback={<PageFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/history" element={<History />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/share/:analysisId" element={<Share />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
