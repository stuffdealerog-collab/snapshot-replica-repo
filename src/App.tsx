import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LangProvider } from "@/lib/LangContext";
import { AppProvider } from "@/lib/AppContext";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Intake from "./pages/Intake";
import Chat from "./pages/Chat";
import Invoice from "./pages/Invoice";
import Portal from "./pages/Portal";
import CrmDashboard from "./pages/CrmDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LangProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/intake" element={<Intake />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/invoice/:id" element={<Invoice />} />
              <Route path="/portal" element={<Portal />} />
              <Route path="/crm" element={<CrmDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </LangProvider>
  </QueryClientProvider>
);

export default App;
