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
import { MessageProvider } from "@/context/MessageContext";
import { PushProvider } from "@/context/PushContext";
import ScrollToTop from "@/components/ScrollToTop";
import InstallPrompt from "@/components/InstallPrompt";
import Spinner from "@/components/Spinner";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const About = lazy(() => import("./pages/About"));
const Account = lazy(() => import("./pages/Account"));
const CreateListing = lazy(() => import("./pages/CreateListing"));

const queryClient = new QueryClient();

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
                    <MessageProvider>
                      <PushProvider>
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
                              <Route path="/auth" element={
                                <GuestRoute><Auth /></GuestRoute>
                              } />
                              <Route path="/account" element={
                                <ProtectedRoute allowGuest><Account /></ProtectedRoute>
                              } />
                              <Route path="/listings/new" element={
                                <ProtectedRoute><CreateListing /></ProtectedRoute>
                              } />
                              <Route path="/auth/callback" element={<AuthCallback />} />
                              <Route path="/reset-password" element={<ResetPassword />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </BrowserRouter>
                      </PushProvider>
                    </MessageProvider>
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