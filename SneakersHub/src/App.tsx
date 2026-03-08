import { lazy, Suspense } from "react";
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
import InstallPrompt from "@/components/InstallPrompt";

// Always loaded immediately (lightweight / needed on first paint)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Lazy loaded — only downloaded when the user navigates to them
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const About = lazy(() => import("./pages/About"));
const Account = lazy(() => import("./pages/Account"));
const CreateListing = lazy(() => import("./pages/CreateListing"));

const queryClient = new QueryClient();

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children, allowGuest = false }: { children: React.ReactNode; allowGuest?: boolean }) => {
  const { user, isGuest, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <>{children}</>;
  if (allowGuest && isGuest) return <>{children}</>;
  return <Navigate to="/auth" replace />;
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
                      <Suspense fallback={<Spinner />}>
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
    <ProtectedRoute allowGuest>
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
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
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