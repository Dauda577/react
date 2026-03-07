import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  User, LayoutGrid, ShoppingBag, Heart, Settings,
  MapPin, Eye, Pencil, Trash2, Plus, CheckCircle, ArrowRight, LogOut,
  Store, Tag,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useSaved } from "@/context/SavedContext";

const sellerTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "listings", label: "Listings", icon: LayoutGrid },
  { id: "settings", label: "Settings", icon: Settings },
];

const buyerTabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "saved", label: "Saved", icon: Heart },
  { id: "settings", label: "Settings", icon: Settings },
];

const listings = [
  { id: 1, title: "Nike Air Jordan 1 Retro High OG", price: "$320", status: "active", views: 142, date: "2 days ago" },
  { id: 2, title: "Adidas Yeezy Boost 350 V2", price: "$280", status: "active", views: 310, date: "5 days ago" },
  { id: 3, title: "New Balance 2002R Protection Pack", price: "$180", status: "sold", views: 89, date: "2 weeks ago" },
  { id: 4, title: "Air Max 90 Premium", price: "$220", status: "active", views: 67, date: "3 days ago" },
];

const Account = () => {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [switching, setSwitching] = useState(false);

  const { saved, toggleSaved } = useSaved();

  const tabs = role === "seller" ? sellerTabs : buyerTabs;

  const handleRoleSwitch = (newRole: "buyer" | "seller") => {
    if (newRole === role) return;
    setSwitching(true);
    setTimeout(() => {
      setRole(newRole);
      setActiveTab("profile");
      setSwitching(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Profile Header */}
      <section className="relative pt-16 border-b border-border">
        <div className="section-padding max-w-4xl mx-auto pt-14 pb-0">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-5 pb-8"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="font-display text-xl font-bold text-primary">KA</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background" />
            </div>

            {/* Name */}
            <div className="flex-1">
              {/* Role toggle pill */}
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-background mb-2">
                <button
                  onClick={() => handleRoleSwitch("buyer")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200
                    ${role === "buyer"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Tag className="w-3 h-3" /> Buyer
                </button>
                <button
                  onClick={() => handleRoleSwitch("seller")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200
                    ${role === "seller"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Store className="w-3 h-3" /> Seller
                </button>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight">Kwame Asante</h1>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" /> Accra, Ghana
              </p>
            </div>

            <Button
              onClick={() => { setActiveTab("profile"); setEditMode(!editMode); }}
              variant="outline"
              className="rounded-full h-9 px-5 text-sm hidden sm:flex"
            >
              {editMode
                ? <><CheckCircle className="mr-1.5 w-3.5 h-3.5" /> Done</>
                : <><Pencil className="mr-1.5 w-3.5 h-3.5" /> Edit</>
              }
            </Button>
          </motion.div>

          {/* Role context banner */}
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="mb-4 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2"
            >
              {role === "buyer" ? (
                <>
                  <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    You're browsing as a <span className="font-semibold text-foreground">Buyer</span> — track orders and save items you love.
                    <button onClick={() => handleRoleSwitch("seller")} className="ml-1.5 text-primary font-semibold hover:opacity-70 transition-opacity">
                      Switch to Seller →
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    You're in <span className="font-semibold text-foreground">Seller mode</span> — manage your listings and track performance.
                    <button onClick={() => handleRoleSwitch("buyer")} className="ml-1.5 text-primary font-semibold hover:opacity-70 transition-opacity">
                      Switch to Buyer →
                    </button>
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
                  ${activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === "saved" && saved.length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {saved.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding max-w-4xl mx-auto py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${role}-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: switching ? 0 : 1, y: switching ? 6 : 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >

            {/* ── Profile (shared) ── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "First Name", value: "Kwame" },
                    { label: "Last Name", value: "Asante" },
                    { label: "Email", value: "kwame@email.com" },
                    { label: "Phone", value: "+233 24 000 0000" },
                    { label: "City", value: "Accra" },
                    { label: "Region", value: "Greater Accra" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                        {f.label}
                      </label>
                      <input
                        defaultValue={f.value}
                        disabled={!editMode}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
                      />
                    </div>
                  ))}

                  {/* Seller-only: shop name */}
                  {role === "seller" && (
                    <div className="col-span-full">
                      <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                        Shop Name
                      </label>
                      <input
                        defaultValue="Kwame's Sneaker Vault"
                        disabled={!editMode}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all font-[inherit]"
                      />
                    </div>
                  )}

                  <div className="col-span-full">
                    <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Bio</label>
                    <textarea
                      defaultValue={
                        role === "seller"
                          ? "Trusted seller based in Accra. Quality sneakers, fair prices."
                          : "Sneaker enthusiast based in Accra."
                      }
                      disabled={!editMode}
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                        focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                        disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-all font-[inherit]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {editMode ? (
                    <Button className="btn-primary rounded-full h-9 px-6 text-sm" onClick={() => setEditMode(false)}>
                      Save Changes <CheckCircle className="ml-1.5 w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button variant="outline" className="rounded-full h-9 px-6 text-sm" onClick={() => setEditMode(true)}>
                      <Pencil className="mr-1.5 w-3.5 h-3.5" /> Edit Profile
                    </Button>
                  )}
                  <button className="text-sm text-red-500 flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </div>
            )}

            {/* ── Seller: Listings ── */}
            {role === "seller" && activeTab === "listings" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-muted-foreground">
                    {listings.filter(l => l.status === "active").length} active listings
                  </p>
                  <Button className="btn-primary rounded-full h-9 px-5 text-sm">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New Listing
                  </Button>
                </div>
                <div className="space-y-2">
                  {listings.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:bg-primary/5 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                        👟
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.date}</span>
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Eye className="w-3 h-3" /> {item.views}
                          </span>
                          <span className={`text-xs font-medium ${item.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>
                            {item.status === "active" ? "Active" : "Sold"}
                          </span>
                        </div>
                      </div>
                      <p className="font-display font-bold text-sm flex-shrink-0">{item.price}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-primary/10 transition-colors">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Buyer: Orders ── */}
            {role === "buyer" && activeTab === "orders" && (
              <div className="text-center py-20">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight mb-2">No orders yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                  Your purchase history will appear here.
                </p>
                <Link to="/shop">
                  <Button className="btn-primary rounded-full h-9 px-6 text-sm">
                    Shop Now <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}

            {/* ── Buyer: Saved ── */}
            {role === "buyer" && activeTab === "saved" && (
              <div>
                {saved.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-display text-lg font-bold tracking-tight mb-2">Nothing saved</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                      Save listings you like to find them later.
                    </p>
                    <Link to="/shop">
                      <Button className="btn-primary rounded-full h-9 px-6 text-sm">
                        Browse <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm text-muted-foreground">
                        {saved.length} saved {saved.length === 1 ? "item" : "items"}
                      </p>
                      <Link to="/shop">
                        <Button variant="outline" className="rounded-full h-8 px-4 text-xs">
                          Browse more <ArrowRight className="ml-1 w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence>
                        {saved.map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 20, scale: 0.97 }}
                            transition={{ delay: i * 0.05, duration: 0.2 }}
                            className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border hover:bg-primary/5 transition-colors group"
                          >
                            <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-lg">
                                  👟
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {item.brand && (
                                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium mb-0.5">
                                  {item.brand}
                                </p>
                              )}
                              <p className="font-medium text-sm truncate">{item.title}</p>
                              <p className="font-display font-bold text-sm text-primary mt-0.5">{item.price}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link to={`/product/${item.id}`}>
                                <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors">
                                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </Link>
                              <button
                                onClick={() => toggleSaved(item)}
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-500/10 hover:border-red-300 transition-colors"
                                aria-label="Remove from saved"
                              >
                                <Heart className="w-3.5 h-3.5 text-red-400" fill="currentColor" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Settings (shared) ── */}
            {activeTab === "settings" && (
              <div className="text-center py-20">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold tracking-tight mb-2">Settings</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Preferences and notifications coming soon.
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </section>

      <Footer />
    </div>
  );
};

export default Account;
