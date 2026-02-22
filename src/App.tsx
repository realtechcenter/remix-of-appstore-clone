import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MacMenuBar } from "@/components/MacMenuBar";
import { MacDock } from "@/components/MacDock";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AppDetail from "./pages/AppDetail";
import Auth from "./pages/Auth";
import MyPurchases from "./pages/MyPurchases";
import PaymentHistory from "./pages/PaymentHistory";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col h-screen overflow-hidden">
                <MacMenuBar />
                <div className="flex-1 overflow-y-auto scrollbar-macos pb-16">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/my-purchases" element={<MyPurchases />} />
                    <Route path="/payment-history" element={<PaymentHistory />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/:id" element={<AppDetail />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <MacDock />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
