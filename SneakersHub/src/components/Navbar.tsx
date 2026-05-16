import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Zap, Search, User, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

const QUICK_CATEGORIES = [
  { label: "Sneakers",    svg: "/categoryicons/sneakers.svg",    color: "from-blue-500/20 to-blue-600/20" },
  { label: "Phones",      svg: "/categoryicons/phones.svg",      color: "from-green-500/20 to-green-600/20" },
  { label: "Clothes",     svg: "/categoryicons/tops.svg",        color: "from-pink-500/20 to-pink-600/20" },
  { label: "Electronics", svg: "/categoryicons/electronics.svg", color: "from-violet-500/20 to-violet-600/20" },
  { label: "Bags",        svg: "/categoryicons/bags.svg",        color: "from-amber-500/20 to-amber-600/20" },
  { label: "Accessories", svg: "/categoryicons/accessories.svg", color: "from-emerald-500/20 to-emerald-600/20" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const postHref = user ? "/listings/new" : "/auth";
  const isSearchActive = location.pathname === "/search";

  const links = [
    { to: "/",        label: "Home" },
    { to: "/shop",    label: "Browse" },
    { to: "/featured", label: "Featured", special: true },
    { to: "/about",   label: "About" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-xl border-b border-border shadow-lg"
          : "bg-background/80 backdrop-blur-sm border-b border-border/50"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo — TODO: update to new brand name */}
          <Link to="/" className="flex items-center gap-1">
            <span className="font-display text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Sneakers
            </span>
            <span className="font-display text-xl font-bold text-foreground">
              Hub
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                  ${location.pathname === link.to
                    ? "text-primary bg-primary/10"
                    : link.special
                      ? "text-amber-500 hover:bg-amber-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                {link.special && <Zap className="w-3.5 h-3.5" />}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">

            {/* Search */}
            <button
              onClick={() => navigate("/search")}
              className={`p-2 rounded-full transition-colors ${
                isSearchActive
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Post CTA — desktop */}
            <Link
              to={postHref}
              className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Post
            </Link>

            {/* Account */}
            <Link
              to={user ? "/account" : "/auth"}
              className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              aria-label="Account"
            >
              <User className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-muted/50 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
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
                className={`flex items-center gap-2 py-3 px-4 rounded-xl font-medium transition-all
                  ${location.pathname === link.to
                    ? "bg-primary/10 text-primary"
                    : link.special
                      ? "text-amber-500 hover:bg-amber-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                {link.special && <Zap className="w-3.5 h-3.5" />}
                {link.label}
              </Link>
            ))}

            {/* Post CTA — mobile */}
            <Link
              to={postHref}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              <PlusCircle className="w-4 h-4" /> Post a Listing
            </Link>

            {/* Category Shortcuts */}
            <div className="border-t border-border pt-4 mt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Browse Categories
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_CATEGORIES.map((c) => (
                  <Link
                    key={c.label}
                    to={`/shop?category=${c.label}`}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r ${c.color} border border-border/50 text-sm font-medium text-foreground hover:scale-[1.02] transition-all`}
                  >
                    <img src={c.svg} alt={c.label} className="w-5 h-5" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="border-t border-border pt-4 mt-1">
                <Link
                  to="/account"
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{user.name || "My Account"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;