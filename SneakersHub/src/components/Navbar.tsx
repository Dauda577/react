import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X, Bell, Zap, Store, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import BecomeSellerDrawer from "@/components/Becomesellerdrawer";
import { PRODUCT_CATEGORIES } from "@/data/sneakers";

// Quick-access category shortcuts shown in the mobile menu
// One representative per group keeps it scannable
const QUICK_CATEGORIES = [
  { label: "Sneakers",     svg: "/categoryicons/sneakers.svg"    },
  { label: "Watches",      svg: "/categoryicons/watches.svg"     },
  { label: "Tops",         svg: "/categoryicons/tops.svg"        },
  { label: "Bags",         svg: "/categoryicons/bags.svg"        },
  { label: "Accessories",  svg: "/categoryicons/accessories.svg" },
];

const Navbar = () => {
  const { totalItems } = useCart();
  const { unseenCount } = useOrders();
  const { totalUnread } = useMessages();
  const { user, role, activeMode, switchMode } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sellerDrawerOpen, setSellerDrawerOpen] = useState(false);

  const showOrderBadge  = user?.role === "seller" && unseenCount > 0;
  const showMessageBadge = !!user && totalUnread > 0;
  const totalBellCount  = (showOrderBadge ? unseenCount : 0) + (showMessageBadge ? totalUnread : 0);
  const showBell        = totalBellCount > 0;

  const showBecomeSeller = !!user && !user.isSeller && user.sellerAppStatus === "none";

  const links = [
    { to: "/",        label: "Home"     },
    { to: "/shop",    label: "Shop"     },
    { to: "/featured",label: "Featured" },
    { to: "/account", label: "Account"  },
    { to: "/about",   label: "About"    },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-40 glass-card border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="section-padding flex items-center justify-between h-16 max-w-7xl mx-auto">

          {/* Brand */}
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">
            Sneakers<span className="text-gradient">Hub</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link key={link.to} to={link.to}
                className={`text-sm font-medium tracking-wide uppercase relative flex items-center gap-1
                  ${link.to === "/featured"
                    ? "text-amber-500 hover:text-amber-400 transition-colors"
                    : "nav-link"
                  }`}
              >
                {link.to === "/featured" && <Zap className="w-3 h-3 fill-current" />}
                {link.label}
                {link.to === "/account" && showBell && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-3 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold"
                  >
                    {totalBellCount}
                  </motion.span>
                )}
              </Link>
            ))}
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-3">

            {/* Bell */}
            {showBell && (
              <Link to="/account" className="relative group">
                <motion.div animate={{ rotate: [0, -15, 15, -10, 10, 0] }} transition={{ duration: 0.6, delay: 0.4 }}>
                  <Bell className="w-5 h-5 text-primary" />
                </motion.div>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {totalBellCount}
                </motion.span>
              </Link>
            )}

            {/* Buy / Sell mode switcher */}
            {user?.isSeller && user?.isBuyer && (
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-0.5 border border-border">
                <button
                  onClick={() => switchMode("buyer")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    activeMode === "buyer"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ShoppingCart className="w-3 h-3" /> Buy
                </button>
                <button
                  onClick={() => switchMode("seller")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    activeMode === "seller"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Store className="w-3 h-3" /> Sell
                </button>
              </div>
            )}

            {/* Become a Seller CTA — desktop */}
            {showBecomeSeller && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSellerDrawerOpen(true)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-all"
              >
                <Store className="w-3 h-3" /> Start Selling
              </motion.button>
            )}

            {/* Cart */}
{activeMode === "buyer" ? (
  <Link 
    to="/cart" 
    className="relative group"
    aria-label={`Shopping cart${totalItems > 0 ? `, ${totalItems} item${totalItems !== 1 ? 's' : ''}` : ''}`}
  >
    <ShoppingBag className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
    {totalItems > 0 && (
      <motion.span 
        initial={{ scale: 0 }} 
        animate={{ scale: 1 }}
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold"
        aria-hidden="true"
      >
        {totalItems}
      </motion.span>
    )}
  </Link>
            ) : (
              <div className="relative group cursor-not-allowed">
                <ShoppingBag className="w-5 h-5 text-muted-foreground opacity-50" />
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-40 p-1.5 bg-gray-900 text-white text-[10px] rounded shadow-lg whitespace-nowrap">
                  Switch to Buyer mode to shop
                </div>
              </div>
            )}

            {/* Mobile menu toggle */}
<button 
  className="md:hidden" 
  onClick={() => setMobileOpen(!mobileOpen)}
  aria-label={mobileOpen ? "Close menu" : "Open menu"}
>
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

                {/* Nav links */}
                {links.map((link) => (
                  <Link key={link.to} to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`text-sm font-medium tracking-wide uppercase flex items-center gap-2
                      ${link.to === "/featured" ? "text-amber-500" : "nav-link"}`}
                  >
                    {link.to === "/featured" && <Zap className="w-3.5 h-3.5 fill-current" />}
                    {link.label}
                    {link.to === "/account" && showBell && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                        {totalBellCount}
                      </span>
                    )}
                  </Link>
                ))}

                {/* Category shortcuts */}
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-2.5">
                    Browse by category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_CATEGORIES.map((c) => (
                      <Link
                        key={c.label}
                        to={`/shop?category=${c.label}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary transition-all"
                      >
                        <img src={c.svg} alt={c.label} className="w-4 h-4" /> {c.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Become a Seller — mobile */}
                {showBecomeSeller && (
                  <button
                    onClick={() => { setMobileOpen(false); setSellerDrawerOpen(true); }}
                    className="flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    <Store className="w-4 h-4" /> Start Selling
                  </button>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <BecomeSellerDrawer open={sellerDrawerOpen} onClose={() => setSellerDrawerOpen(false)} />
    </>
  );
};

export default Navbar;