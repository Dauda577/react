import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { SavedProvider } from "@/context/SavedContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { OrderProvider } from "@/context/OrderContext";
import { ListingProvider } from "@/context/ListingContext";
import { RatingProvider } from "@/context/RatingContext";
import { PublicListingsProvider } from "@/context/PublicListingsContext";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import About from "./pages/About";
import Account from "./pages/Account";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import CreateListing from "./pages/CreateListing";
import NotFound from "./pages/NotFound";
import InstallPrompt from "@/components/InstallPrompt";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <OrderProvider>
          <RatingProvider>
            <PublicListingsProvider>
              <ListingProvider>
            <SavedProvider>
              <CartProvider>
                <Toaster />
                <Sonner />
                <InstallPrompt />
                <BrowserRouter>
                  <ScrollToTop />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-confirmation" element={<OrderConfirmation />} />
                    <Route path="/about" element={<About />} />
                    <Route
                      path="/auth"
                      element={
                        <GuestRoute>
                          <Auth />
                        </GuestRoute>
                      }
                    />
                    <Route
                      path="/account"
                      element={
                        <ProtectedRoute>
                          <Account />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/listings/new"
                      element={
                        <ProtectedRoute>
                          <CreateListing />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                  </Routes>
                </BrowserRouter>
              </CartProvider>
            </SavedProvider>
              </ListingProvider>
            </PublicListingsProvider>
          </RatingProvider>
        </OrderProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;