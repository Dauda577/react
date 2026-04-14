import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, Bell, Zap, Store, Search, User, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useMessages } from "@/context/MessageContext";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import BecomeSellerDrawer from "@/components/Becomesellerdrawer";

const QUICK_CATEGORIES = [
  { label: "Sneakers", svg: "/categoryicons/sneakers.svg", color: "from-blue-500/20 to-blue-600/20" },
  { label: "Watches", svg: "/categoryicons/watches.svg", color: "from-purple-500/20 to-purple-600/20" },
  { label: "Tops", svg: "/categoryicons/tops.svg", color: "from-pink-500/20 to-pink-600/20" },
  { label: "Bags", svg: "/categoryicons/bags.svg", color: "from-amber-500/20 to-amber-600/20" },
  { label: "Accessories", svg: "/categoryicons/accessories.svg", color: "from-emerald-500/20 to-emerald-600/20" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { orders } = useOrders();
  const { totalUnread } = useMessages();
  const { user, activeMode } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sellerDrawerOpen, setSellerDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const canSell = user?.isSeller ?? user?.role === "seller";

  const incompleteOrdersCount = canSell
    ? orders.filter(o =>
      (o.sellerId === user?.id && !(o.sellerConfirmed && o.buyerConfirmed)) ||
      (o.buyerId === user?.id && !o.buyerConfirmed)
    ).length
    : orders.filter(o => o.buyerId === user?.id && !o.buyerConfirmed).length;

  const showOrderBadge = !!user && incompleteOrdersCount > 0;
  const showMessageBadge = !!user && totalUnread > 0;
  const totalBellCount = (showOrderBadge ? incompleteOrdersCount : 0) + (showMessageBadge ? totalUnread : 0);
  const showBell = totalBellCount > 0;
  const showBecomeSeller = !!user && !user.isSeller && user.sellerAppStatus === "none";

  const isSearchActive = location.pathname === "/search";

  const links = [
    { to: "/", label: "Home", icon: null },
    { to: "/shop", label: "Shop", icon: null },
    { to: "/featured", label: "Featured", icon: <Zap className="w-3.5 h-3.5" />, special: true },
    { to: "/account", label: "Account", icon: null },
    { to: "/about", label: "About", icon: null },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-lg"
            : "bg-background/80 backdrop-blur-sm border-b border-border/50"
          }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Brand Logo */}
            <Link to="/" className="group relative flex items-center gap-1">
              <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Sneakers
              </span>
              <span className="font-display text-xl font-bold text-foreground">
                Hub
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${location.pathname === link.to
                      ? "text-primary bg-primary/10"
                      : link.special
                        ? "text-amber-500 hover:bg-amber-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  <span className="flex items-center gap-1.5">
                    {link.icon}
                    {link.label}
                  </span>
                  {link.to === "/account" && showBell && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold shadow-lg">
                      {totalBellCount > 9 ? "9+" : totalBellCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Right-side Actions */}
            <div className="flex items-center gap-2">

              {/* Search — navigates to /search page */}
              <button
                onClick={() => navigate("/search")}
                className={`p-2 rounded-full transition-colors ${isSearchActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Bell Notifications */}
              {showBell && (
                <Link
                  to="/account"
                  className="relative p-2 rounded-full hover:bg-muted/50 transition-colors group"
                >
                  <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center px-1 font-bold shadow-lg">
                    {totalBellCount > 9 ? "9+" : totalBellCount}
                  </span>
                </Link>
              )}

              {/* Become a Seller CTA — Desktop */}
              {showBecomeSeller && (
                <button
                  onClick={() => setSellerDrawerOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <Store className="w-3.5 h-3.5" />
                  Start Selling
                </button>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-full hover:bg-muted/50 transition-colors group"
                aria-label={`Shopping cart${totalItems > 0 ? `, ${totalItems} item${totalItems !== 1 ? "s" : ""}` : ""}`}
              >
                <ShoppingBag className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center px-1 font-bold shadow-lg">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 rounded-full hover:bg-muted/50 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 flex flex-col gap-3">

              {/* Nav Links */}
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200
                    ${location.pathname === link.to
                      ? "bg-primary/10 text-primary"
                      : link.special
                        ? "text-amber-500 hover:bg-amber-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {link.icon}
                    {link.label}
                  </span>
                  {link.to === "/account" && showBell && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {totalBellCount > 9 ? "9+" : totalBellCount}
                    </span>
                  )}
                </Link>
              ))}

              {/* Category Shortcuts */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Browse Categories
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_CATEGORIES.map((c) => (
                    <Link
                      key={c.label}
                      to={`/shop?category=${c.label}`}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r ${c.color} border border-border/50 text-sm font-medium text-foreground hover:scale-[1.02] transition-all`}
                    >
                      <img src={c.svg} alt={c.label} className="w-5 h-5" />
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Become a Seller — Mobile */}
              {showBecomeSeller && (
                <button
                  onClick={() => { setMobileOpen(false); setSellerDrawerOpen(true); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold mt-2"
                >
                  <Store className="w-4 h-4" /> Start Selling Today
                </button>
              )}

              {/* User Info */}
              {user && (
                <div className="border-t border-border pt-4 mt-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{user.name || "User"}</p>
                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <BecomeSellerDrawer open={sellerDrawerOpen} onClose={() => setSellerDrawerOpen(false)} />
    </>
  );
};

export default Navbar;