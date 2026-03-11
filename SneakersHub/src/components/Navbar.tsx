import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X, Bell, Zap } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const Navbar = () => {
  const { totalItems } = useCart();
  const { unseenCount } = useOrders();
  const { totalUnread } = useMessages();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showOrderBadge = user?.role === "seller" && unseenCount > 0;
  // Messages bell shows for both buyers and sellers
  const showMessageBadge = !!user && totalUnread > 0;
  // Combined bell: ring if either has notifications
  const totalBellCount = (showOrderBadge ? unseenCount : 0) + (showMessageBadge ? totalUnread : 0);
  const showBell = totalBellCount > 0;

  const links = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/featured", label: "Featured" },
    { to: "/account", label: "Account" },
    { to: "/about", label: "About" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="section-padding flex items-center justify-between h-16 max-w-7xl mx-auto">
        <Link to="/" className="font-display text-xl font-bold tracking-tighter">
          Sneakers<span className="text-gradient">Hub</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link key={link.to} to={link.to}
              className={`text-sm font-medium tracking-wide uppercase relative flex items-center gap-1
                ${link.to === "/featured" ? "text-amber-500 hover:text-amber-400 transition-colors" : "nav-link"}`}>
              {link.to === "/featured" && <Zap className="w-3 h-3 fill-current" />}
              {link.label}
              {link.to === "/account" && showBell && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold"
                >
                  {totalBellCount}
                </motion.span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Bell — orders (seller) + messages (buyer & seller) */}
          {showBell && (
            <Link to="/account" className="relative group">
              <motion.div
                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Bell className="w-5 h-5 text-primary" />
              </motion.div>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold"
              >
                {totalBellCount}
              </motion.span>
            </Link>
          )}

          {/* Cart */}
          <Link to="/cart" className="relative group">
            <ShoppingBag className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            {totalItems > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold"
              >
                {totalItems}
              </motion.span>
            )}
          </Link>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-border"
          >
            <div className="section-padding py-4 flex flex-col gap-4">
              {links.map((link) => (
                <Link key={link.to} to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm font-medium tracking-wide uppercase flex items-center gap-2
                    ${link.to === "/featured" ? "text-amber-500" : "nav-link"}`}>
                  {link.to === "/featured" && <Zap className="w-3.5 h-3.5 fill-current" />}
                  {link.label}
                  {link.to === "/account" && showBell && (
                    <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                      {totalBellCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;