import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Lock } from "lucide-react";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const CashierPage = lazy(() => import("./pages/CashierPage"));
const KitchenPage = lazy(() => import("./pages/KitchenPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cashier" element={<CashierPage />} />
            <Route path="/kitchen" element={<KitchenPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>

        {/* Global Watermark */}
        <div className="fixed bottom-3 left-3 z-[9999] pointer-events-none select-none">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 hover:bg-white/20 hover:scale-105">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium tracking-wide text-foreground/60 uppercase">
              Programmed by <span className="font-bold text-foreground">nicko</span>
            </span>
          </div>
        </div>

        {/* Admin Button */}
        <div className="fixed bottom-3 right-3 z-[9999]">
          <Link
            to="/admin"
            className="flex items-center justify-center p-2 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 hover:bg-white/20 hover:scale-110 opacity-30 hover:opacity-100"
          >
            <Lock className="w-4 h-4 text-foreground/60 hover:text-foreground" />
          </Link>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
