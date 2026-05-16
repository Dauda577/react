import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Upload, X, CheckCircle, Tag,
  ChevronDown, FileText, Image, Phone, Truck, BadgeCheck,
} from "lucide-react";
import { useListings, Listing } from "@/context/ListingContext";
import { usePublicListings } from "@/context/PublicListingsContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PRODUCT_CATEGORIES } from "@/data/sneakers";

// ─── Static data ──────────────────────────────────────────────────────────────

const ghanaRegions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern", "Volta",
  "Northern", "North East", "Savannah", "Upper East", "Upper West",
  "Oti", "Bono", "Bono East", "Ahafo", "Western North",
];

const sneakerSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
const clothingSizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

const CONDITIONS = [
  { value: "new",       label: "New",       sub: "Never used, tags/box intact" },
  { value: "like_new",  label: "Like New",  sub: "Used once or twice, no flaws" },
  { value: "good",      label: "Good",      sub: "Normal wear, no major flaws" },
  { value: "fair",      label: "Fair",      sub: "Visible wear, fully functional" },
  { value: "poor",      label: "Poor",      sub: "Heavy wear or minor damage" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryLabels = PRODUCT_CATEGORIES.map((c) => c.label);

const usesSneakerSizes = (cat: string) => cat === "Sneakers";
const usesClothingSizes = (cat: string) =>
  ["Tops", "Bottoms", "Outerwear", "Activewear", "Clothes"].includes(cat);

const getTitlePlaceholder = (category: string) => {
  const map: Record<string, string> = {
    Sneakers:   "e.g. Air Jordan 1 Retro High OG, Size 42",
    Watches:    "e.g. Casio G-Shock GA-2100, Black",
    Tops:       "e.g. Nike Oversized Tee, Large",
    Bottoms:    "e.g. Levi's 501 Slim Jeans, Size 32",
    Phones:     "e.g. iPhone 13 Pro, 256GB, Midnight",
    Electronics:"e.g. JBL Flip 6 Bluetooth Speaker",
    Bags:       "e.g. Nike Gym Bag, Black",
    Furniture:  "e.g. Wooden 4-Seater Dining Table",
    Accessories:"e.g. Oakley Sunglasses",
  };
  return map[category] ?? "Give your listing a clear title";
};

const getDescriptionPlaceholder = (category: string) => {
  const map: Record<string, string> = {
    Sneakers:    "Condition, box included, any flaws, reason for selling...",
    Watches:     "Condition, box/papers included, any scratches, reason for selling...",
    Phones:      "Storage, colour, battery health, any cracks or faults, accessories included...",
    Electronics: "Working condition, what's included in the box, any faults...",
    Furniture:   "Dimensions, material, condition, reason for selling...",
  };
  return map[category] ?? "Describe the item — condition, what's included, why you're selling...";
};

// ─── Image compression ────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  const MAX_PX = 800;
  const QUALITY = 0.8;
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) { height = Math.round((height / width) * MAX_PX); width = MAX_PX; }
        else { width = Math.round((width / height) * MAX_PX); height = MAX_PX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp", QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addListing, updateListing } = useListings();
  const { refreshListing } = usePublicListings();
  const { user } = useAuth();

  const editing = location.state?.listing as Listing | undefined;

  const [form, setForm] = useState({
    title:       editing?.title ?? editing?.name ?? "",
    brand:       editing?.brand ?? "",
    price:       editing?.price?.toString() ?? "",
    category:    editing?.category ?? categoryLabels[0],
    description: editing?.description ?? "",
    city:        editing?.city ?? "",
    region:      editing?.region ?? "",
    phone:       editing?.phone ?? "",
    condition:   editing?.condition ?? "good",
    negotiable:  editing?.negotiable ?? false,
    delivery:    editing?.delivery ?? false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleBool = (key: "negotiable" | "delivery") => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Pre-fill city/region from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("city, region, phone")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data && !editing) {
          setForm((prev) => ({
            ...prev,
            city:  prev.city  || data.city  || "",
            region: prev.region || data.region || "",
            phone: prev.phone || data.phone || "",
          }));
        }
      });
  }, [user?.id]);

  // Sizes
  const initialSneakerSizes = editing?.sizes && usesSneakerSizes(editing.category)
    ? (editing.sizes as (string | number)[]).map((s) => Number(s)).filter((s) => !Number.isNaN(s))
    : [];
  const initialClothingSizes = editing?.sizes && usesClothingSizes(editing.category)
    ? (editing.sizes as (string | number)[]).map((s) => String(s))
    : [];

  const [selectedSizes, setSelectedSizes] = useState<number[]>(initialSneakerSizes);
  const [selectedClothingSizes, setSelectedClothingSizes] = useState<string[]>(initialClothingSizes);

  const toggleSneakerSize = (size: number) =>
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size].sort((a, b) => a - b)
    );

  const toggleClothingSize = (size: string) =>
    setSelectedClothingSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );

  // Images
  const [images, setImages] = useState<string[]>(editing?.image ? [editing.image] : []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const MAX_IMAGES = 5;
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    if (toAdd[0].size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    const compressed = await Promise.all(toAdd.map(compressImage));
    compressed.forEach((f) => {
      const r = new FileReader();
      r.onload = () => setImages((prev) => [...prev, r.result as string].slice(0, MAX_IMAGES));
      r.readAsDataURL(f);
    });
    setImageFiles((prev) => [...prev, ...compressed].slice(0, MAX_IMAGES));
  };

  // Submit
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const { title, brand, price, category, description, region, phone, condition } = form;

    if (!title.trim()) { toast.error("Give your listing a title"); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { toast.error("Enter a valid price"); return; }
    if (!description.trim()) { toast.error("Add a description"); return; }
    if (!region) { toast.error("Select your region"); return; }
    if (!phone.trim()) { toast.error("Add a contact number for buyers"); return; }
    if (usesSneakerSizes(category) && selectedSizes.length === 0) { toast.error("Select at least one size"); return; }
    if (usesClothingSizes(category) && selectedClothingSizes.length === 0) { toast.error("Select at least one size"); return; }

    const sizesToSave = usesSneakerSizes(category)
      ? [...new Set(selectedSizes)].sort((a, b) => a - b).map(String)
      : usesClothingSizes(category)
        ? [...new Set(selectedClothingSizes)]
        : [];

    const payload = {
      // support both title and name fields during migration
      title:       title.trim(),
      name:        title.trim(),
      brand:       brand.trim() || null,
      price:       Number(price),
      category,
      description: description.trim(),
      sizes:       sizesToSave,
      city:        form.city.trim() || null,
      region:      region || null,
      phone:       phone.trim(),
      condition,
      negotiable:  form.negotiable,
      delivery:    form.delivery,
      image:       null,
    };

    setLoading(true);
    try {
      if (editing) {
        await updateListing(editing.id, payload, imageFiles[0] ?? undefined, imageFiles.slice(1));
        await refreshListing(editing.id);
        toast.success("Listing updated!");
      } else {
        await addListing(payload, imageFiles[0] ?? undefined, imageFiles.slice(1));
        toast.success("Listing published!");
      }
      navigate(editing ? "/account" : "/account?tab=listings");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const showSneakerSizes = usesSneakerSizes(form.category);
  const showClothingSizes = usesClothingSizes(form.category);
  const showSizes = showSneakerSizes || showClothingSizes;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        className="max-w-2xl mx-auto px-4 sm:px-6 pb-20"
        style={{ paddingTop: `calc(88px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => navigate("/account")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Account
          </button>
          <p className="text-primary font-display text-xs font-semibold uppercase tracking-[0.3em] mb-1">
            {editing ? "Edit Listing" : "New Listing"}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {editing ? "Update your listing" : "Post something"}
          </h1>
        </motion.div>

        <div className="space-y-5">

          {/* ── Photos ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border p-6"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" /> Photos
            </p>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
                  <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-contain p-2" />
                  <button
                    onClick={() => {
                      setImages((prev) => prev.filter((_, i) => i !== idx));
                      setImageFiles((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50
                    flex flex-col items-center justify-center gap-1 transition-colors group"
                >
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-[11px] text-muted-foreground">
                    {images.length === 0 ? "Add photo" : "Add more"}
                  </p>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {images.length}/{MAX_IMAGES} photos · First photo is the cover
            </p>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          </motion.div>

          {/* ── Details ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border p-6 space-y-4"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Details
            </p>

            {/* Category */}
            <div>
              <label className="form-label">Category</label>
              <div className="relative">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="input-base appearance-none cursor-pointer"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>{c.emoji}  {c.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="form-label">Title</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder={getTitlePlaceholder(form.category)}
                className="input-base"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Be specific — include brand, model, size, colour.</p>
            </div>

            {/* Brand (optional free text) */}
            <div>
              <label className="form-label">Brand <span className="text-muted-foreground font-normal normal-case">(optional)</span></label>
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="e.g. Nike, Samsung, IKEA"
                className="input-base"
              />
            </div>

            {/* Price */}
            <div>
              <label className="form-label">Price (GHS)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-display font-semibold">₵</span>
                <input
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  className="input-base pl-10"
                />
              </div>
            </div>

            {/* Negotiable toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-semibold text-foreground">Negotiable</p>
                <p className="text-xs text-muted-foreground">Buyers can haggle on the price</p>
              </div>
              <button
                onClick={() => toggleBool("negotiable")}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.negotiable ? "bg-primary" : "bg-muted border border-border"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.negotiable ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>

            {/* City + Region */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">City</label>
                <input
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Kumasi"
                  className="input-base"
                />
              </div>
              <div>
                <label className="form-label">Region <span className="text-red-400">*</span></label>
                <div className="relative">
                  <select
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    className="input-base appearance-none cursor-pointer"
                  >
                    <option value="">Select region</option>
                    {ghanaRegions.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder={getDescriptionPlaceholder(form.category)}
                className="input-base resize-none"
              />
            </div>
          </motion.div>

          {/* ── Condition ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
            className="rounded-2xl border border-border p-6"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" /> Condition
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setForm((prev) => ({ ...prev, condition: c.value }))}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    form.condition === c.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    form.condition === c.value ? "border-primary" : "border-muted-foreground/40"
                  }`}>
                    {form.condition === c.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none mb-0.5">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Sizes (conditional) ── */}
          {showSizes && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  {showSneakerSizes ? "Available Sizes (EU)" : "Available Sizes"}
                </p>
                {(showSneakerSizes ? selectedSizes.length : selectedClothingSizes.length) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {showSneakerSizes ? selectedSizes.length : selectedClothingSizes.length} selected
                  </span>
                )}
              </div>
              {showSneakerSizes && (
                <div className="flex flex-wrap gap-2">
                  {sneakerSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSneakerSize(size)}
                      className={`w-12 h-12 rounded-xl text-sm font-display font-semibold transition-all border ${
                        selectedSizes.includes(size)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
              {showClothingSizes && (
                <div className="flex flex-wrap gap-2">
                  {clothingSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleClothingSize(size)}
                      className={`px-4 h-12 rounded-xl text-sm font-display font-semibold transition-all border ${
                        selectedClothingSizes.includes(size)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Contact & Delivery ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
            className="rounded-2xl border border-border p-6 space-y-4"
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contact & Delivery
            </p>

            {/* Phone */}
            <div>
              <label className="form-label">WhatsApp / Phone <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">🇬🇭</span>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0XX XXX XXXX"
                  type="tel"
                  className="input-base pl-10"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Buyers will contact you on this number.</p>
            </div>

            {/* Delivery toggle */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Delivery available</p>
                  <p className="text-xs text-muted-foreground">You can deliver to the buyer</p>
                </div>
              </div>
              <button
                onClick={() => toggleBool("delivery")}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${form.delivery ? "bg-primary" : "bg-muted border border-border"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.delivery ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </motion.div>

          {/* ── Submit ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button onClick={handleSubmit} disabled={loading} className="btn-primary w-full h-12 rounded-full text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                  {editing ? "Saving changes..." : "Publishing listing..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {editing ? "Save Changes" : "Publish Listing"}
                </span>
              )}
            </Button>
          </motion.div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CreateListing;