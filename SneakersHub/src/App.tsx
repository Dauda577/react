import { lazy, Suspense, Component, ReactNode, useEffect } from "react"; // Add useEffect
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { useTheme } from "@/hooks/useTheme"; // Import useTheme
import ScrollToTop from "@/components/ScrollToTop";
import InstallPrompt from "@/components/InstallPrompt";
import Spinner from "@/components/Spinner";

import Index from "./pages/Index";
import Privacy from "@/pages/Privacy";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import SafariNotifPrompt from "./components/SafariNotifPrompt";
import TermsOfService from "@/pages/TermsOfService";

const Shop = lazy(() => import("./pages/Shop"));
const Featured = lazy(() => import("./pages/Featured"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const About = lazy(() => import("./pages/About"));
const Account = lazy(() => import("./pages/Account"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const Admin = lazy(() => import("./pages/Admin"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message ?? "Unknown error" };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-display text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: "" }); window.location.href = "/"; }}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

// Create a ThemeWrapper component to use the theme hook
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme(); // This ensures theme is applied at root level
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
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
                        <ThemeWrapper> {/* Add ThemeWrapper here */}
                        <Toaster />
                         <Sonner position="top-center" offset="16px" />
                          <InstallPrompt />
                          <SafariNotifPrompt />
                          <BrowserRouter>
                            <ScrollToTop />
                            <Suspense fallback={<Spinner />}>
                              <Routes>
                                <Route path="/" element={<Index />} />
                                <Route path="/shop" element={<Shop />} />
                                <Route path="/featured" element={<Featured />} />
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
                                <Route path="/privacy" element={<Privacy />} />
                                <Route path="/auth/callback" element={<AuthCallback />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                                <Route path="/admin" element={<Admin />} />
                                <Route path="/unsubscribe" element={<Unsubscribe />} />
                                <Route path="/terms" element={<TermsOfService />} />
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </Suspense>
                          </BrowserRouter>
                        </ThemeWrapper>
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
  </ErrorBoundary>
);

export default App;