import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Search } from "lucide-react";
import Navbar from "@/components/Navbar";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        className="flex min-h-screen items-center justify-center px-4"
        style={{ paddingTop: `calc(64px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 text-center max-w-md mx-auto">

          {/* Big 404 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mb-6 select-none"
          >
            <p
              className="font-display font-bold text-[clamp(6rem,20vw,10rem)] leading-none tracking-tighter text-foreground/5 select-none"
            >
              404
            </p>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">👟</span>
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-3 mb-8"
          >
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold tracking-[0.3em] uppercase text-muted-foreground">
                Page not found
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              This page dropped out of stock
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              The page you're looking for doesn't exist or may have been moved. Head back and find your next look.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full
                bg-primary text-primary-foreground text-sm font-semibold font-display
                hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4" /> Back to Home
            </button>

            <button
              onClick={() => navigate("/shop")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full
                border border-border bg-card text-foreground text-sm font-semibold font-display
                hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Search className="w-4 h-4" /> Browse Shop
            </button>
          </motion.div>

          {/* Go back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-6"
          >
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Go back to previous page
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;