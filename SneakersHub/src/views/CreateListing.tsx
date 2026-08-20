"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "@/lib/router";
import {
  ArrowLeft, Upload, X, CheckCircle, Tag, Check,
  ChevronDown, FileText, Image, Phone, Truck, BadgeCheck, ChevronRight,
} from "lucide-react";
import { useListings, Listing } from "@/context/ListingContext";
import { usePublicListings } from "@/context/PublicListingsContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { TAXONOMY, resolvePath, resolvePathByLabels, sizeKindFor, type SizeKind } from "@/data/taxonomy";

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

const STEPS = [
  { id: "category",  label: "Category",           icon: Tag },
  { id: "details",   label: "Details",            icon: FileText },
  { id: "photos",    label: "Photos",             icon: Image },
  { id: "contact",   label: "Location & Contact", icon: Phone },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTitlePlaceholder = (mainLabel: string, miniLabel: string | null) => {
  const byMini: Record<string, string> = {
    "Sneakers & Trainers": "e.g. Air Jordan 1 Retro High OG, Size 42",
    "Watches":             "e.g. Casio G-Shock GA-2100, Black",
    "Tops & Tees":         "e.g. Nike Oversized Tee, Large",
    "Jeans & Bottoms":     "e.g. Levi's 501 Slim Jeans, Size 32",
    "Smartphones":         "e.g. iPhone 13 Pro, 256GB, Midnight",
  };
  if (miniLabel && byMini[miniLabel]) return byMini[miniLabel];
  const byMain: Record<string, string> = {
    "Phones & Tablets": "e.g. iPhone 13 Pro, 256GB, Midnight",
    "Electronics":      "e.g. JBL Flip 6 Bluetooth Speaker",
    "Home & Garden":    "e.g. Wooden 4-Seater Dining Table",
    "Vehicles":         "e.g. Toyota Corolla 2018, Good condition",
  };
  return byMain[mainLabel] ?? "Give your listing a clear title";
};

const getDescriptionPlaceholder = (mainLabel: string, miniLabel: string | null) => {
  const byMini: Record<string, string> = {
    "Sneakers & Trainers": "Condition, box included, any flaws, reason for selling...",
    "Watches":             "Condition, box/papers included, any scratches, reason for selling...",
    "Smartphones":         "Storage, colour, battery health, any cracks or faults, accessories included...",
  };
  if (miniLabel && byMini[miniLabel]) return byMini[miniLabel];
  const byMain: Record<string, string> = {
    "Phones & Tablets": "Storage, colour, battery health, any cracks or faults, accessories included...",
    "Electronics":      "Working condition, what's included in the box, any faults...",
    "Home & Garden":    "Dimensions, material, condition, reason for selling...",
    "Vehicles":         "Mileage, year, service history, condition, reason for selling...",
  };
  return byMain[mainLabel] ?? "Describe the item — condition, what's included, why you're selling...";
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

  const initialPath = editing
    ? resolvePathByLabels(editing.category, editing.subcategory, editing.subcategory2)
    : null;

  const [form, setForm] = useState({
    title:       editing?.name ?? "",
    brand:       editing?.brand ?? "",
    price:       editing?.price?.toString() ?? "",
    mainId:      initialPath?.main.id ?? TAXONOMY[0].id,
    subId:       initialPath?.sub?.id ?? "",
    miniId:      initialPath?.mini?.id ?? "",
    description: editing?.description ?? "",
    city:        editing?.city ?? "",
    region:      editing?.region ?? "",
    phone:       editing?.phone ?? "",
    condition:   editing?.condition ?? "good",
    negotiable:  editing?.negotiable ?? false,
    delivery:    editing?.deliveryAvailable ?? false,
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMainChange = (mainId: string) => {
    setForm((prev) => ({ ...prev, mainId, subId: "", miniId: "" }));
    setSelectedSizes([]);
    setSelectedClothingSizes([]);
  };

  const handleSubChange = (subId: string) => {
    setForm((prev) => ({ ...prev, subId, miniId: "" }));
    setSelectedSizes([]);
    setSelectedClothingSizes([]);
  };

  const handleMiniChange = (miniId: string) => {
    setForm((prev) => ({ ...prev, miniId }));
    setSelectedSizes([]);
    setSelectedClothingSizes([]);
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
  const initialKind: SizeKind = sizeKindFor(
    initialPath?.main.label, initialPath?.sub?.label, initialPath?.mini?.label
  );
  const initialSneakerSizes = editing?.sizes && initialKind === "sneaker"
    ? (editing.sizes as (string | number)[]).map((s) => Number(s)).filter((s) => !Number.isNaN(s))
    : [];
  const initialClothingSizes = editing?.sizes && initialKind === "clothing"
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

  const path = resolvePath(form.mainId, form.subId || null, form.miniId || null);
  const kind: SizeKind = sizeKindFor(path?.main.label, path?.sub?.label, path?.mini?.label);

  const showSneakerSizes = kind === "sneaker";
  const showClothingSizes = kind === "clothing";
  const showSizes = showSneakerSizes || showClothingSizes;
  const sizeCount = showSneakerSizes ? selectedSizes.length : showClothingSizes ? selectedClothingSizes.length : 0;

  const selectedMain = TAXONOMY.find((m) => m.id === form.mainId);
  const selectedSub = selectedMain?.children?.find((s) => s.id === form.subId);
  const subOptions = selectedMain?.children ?? [];
  const miniOptions = selectedSub?.children ?? [];
  const titlePlaceholder = getTitlePlaceholder(selectedMain?.label ?? "", selectedSub?.children?.find((m) => m.id === form.miniId)?.label ?? null);
  const descriptionPlaceholder = getDescriptionPlaceholder(selectedMain?.label ?? "", selectedSub?.children?.find((m) => m.id === form.miniId)?.label ?? null);

  // Validation per step — returns error message or null
  const validateStep = (s: number): string | null => {
    const { title, price, description, region, phone } = form;
    if (s === 2) {
      if (!title.trim()) return "Give your listing a title";
      if (!price || isNaN(Number(price)) || Number(price) <= 0) return "Enter a valid price";
      if (kind === "sneaker" && selectedSizes.length === 0) return "Select at least one size";
      if (kind === "clothing" && selectedClothingSizes.length === 0) return "Select at least one size";
      if (!description.trim()) return "Add a description";
    }
    if (s === 4) {
      if (!region) return "Select your region";
      if (!phone.trim()) return "Add a contact number for buyers";
    }
    return null;
  };

  const goTo = (n: number) => {
    if (n < 1 || n > STEPS.length) return;
    if (n > step) {
      const err = validateStep(step);
      if (err) { toast.error(err); return; }
    }
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    const err = validateStep(4);
    if (err) { toast.error(err); return; }

    const sizesToSave = kind === "sneaker"
      ? [...new Set(selectedSizes)].sort((a, b) => a - b).map(String)
      : kind === "clothing"
        ? [...new Set(selectedClothingSizes)]
        : [];

    const payload = {
      // support both title and name fields during migration
      title:       form.title.trim(),
      name:        form.title.trim(),
      brand:       (form.brand.trim() || null) as string,
      price:       Number(form.price),
      category:    path!.main.label,
      subcategory: path?.sub?.label ?? null,
      subcategory2: path?.mini?.label ?? null,
      description: form.description.trim(),
      sizes:       sizesToSave as unknown as number[],
      city:        form.city.trim() || null,
      region:      form.region || null,
      phone:       form.phone.trim(),
      condition:   form.condition,
      negotiable:  form.negotiable,
      deliveryAvailable: form.delivery,
      image:       null,
      images:      [],
      whatsapp:    null,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div
        className="max-w-2xl mx-auto px-4 sm:px-6 pb-20"
        style={{ paddingTop: `calc(88px + env(safe-area-inset-top, 0px))` }}
      >
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
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

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => n < step && goTo(n)}
                  disabled={n >= step}
                  className={`flex items-center gap-2 min-w-0 flex-1 ${n >= step ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                    ${done ? "bg-primary text-primary-foreground"
                      : active ? "bg-primary/10 text-primary border border-primary/40"
                      : "bg-muted text-muted-foreground border border-border"}`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : n}
                  </span>
                  <span className={`hidden sm:block text-xs font-medium truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </button>
                {n < STEPS.length && (
                  <div className={`h-px flex-1 ${done ? "bg-primary/50" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >

            {/* ── Step 1: Category ── */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border p-6 space-y-3">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5 mb-4">
                  <Tag className="w-3.5 h-3.5" /> Category
                </p>

                <div>
                  <label className="form-label">Category <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select
                      name="mainId"
                      value={form.mainId}
                      onChange={(e) => handleMainChange(e.target.value)}
                      className="input-base appearance-none cursor-pointer"
                    >
                      {TAXONOMY.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {subOptions.length > 0 && (
                  <div>
                    <label className="form-label">Sub-category</label>
                    <div className="relative">
                      <select
                        name="subId"
                        value={form.subId}
                        onChange={(e) => handleSubChange(e.target.value)}
                        className={`input-base appearance-none cursor-pointer ${form.subId ? "" : "text-muted-foreground"}`}
                      >
                        <option value="">Select sub-category</option>
                        {subOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                )}

                {miniOptions.length > 0 && (
                  <div>
                    <label className="form-label">Type</label>
                    <div className="relative">
                      <select
                        name="miniId"
                        value={form.miniId}
                        onChange={(e) => handleMiniChange(e.target.value)}
                        className={`input-base appearance-none cursor-pointer ${form.miniId ? "" : "text-muted-foreground"}`}
                      >
                        <option value="">Select type</option>
                        {miniOptions.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Details ── */}
            {step === 2 && (
              <div className="space-y-5">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border p-6 space-y-4">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Details
                  </p>

                  {/* Title */}
                  <div>
                    <label className="form-label">Title <span className="text-red-400">*</span></label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder={titlePlaceholder}
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
                    <label className="form-label">Price (GHS) <span className="text-red-400">*</span></label>
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

                  {/* Description */}
                  <div>
                    <label className="form-label">Description <span className="text-red-400">*</span></label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder={descriptionPlaceholder}
                      className="input-base resize-none h-auto min-h-32 py-3"
                    />
                  </div>
                </motion.div>

                {/* Condition */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
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

                {/* Sizes (conditional) */}
                {showSizes && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
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
              </div>
            )}

            {/* ── Step 3: Photos ── */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
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
            )}

            {/* ── Step 4: Location & Contact + Review ── */}
            {step === 4 && (
              <div className="space-y-5">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border p-6 space-y-4">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Location & Contact
                  </p>

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

                {/* Review summary */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="rounded-2xl border border-border p-6"
                >
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Review
                  </p>
                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="text-right font-medium">
                        {[path?.main.label, path?.sub?.label, path?.mini?.label].filter(Boolean).join(" · ") || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Title</dt>
                      <dd className="text-right font-medium truncate max-w-[60%]">{form.title || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="text-right font-semibold text-primary">₵{Number(form.price || 0).toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Condition</dt>
                      <dd className="text-right font-medium">{CONDITIONS.find((c) => c.value === form.condition)?.label ?? form.condition}</dd>
                    </div>
                    {showSizes && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Sizes</dt>
                        <dd className="text-right font-medium">
                          {showSneakerSizes
                            ? [...selectedSizes].sort((a, b) => a - b).join(", ") || "—"
                            : selectedClothingSizes.join(", ") || "—"}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Photos</dt>
                      <dd className="text-right font-medium">{images.length}/5</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="text-right font-medium">{[form.city, form.region].filter(Boolean).join(", ") || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Contact</dt>
                      <dd className="text-right font-medium">{form.phone || "—"}</dd>
                    </div>
                  </dl>
                </motion.div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Step nav */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mt-8"
        >
          {step > 1 && (
            <Button variant="outline" className="rounded-full h-12 px-6 text-sm flex-1" onClick={() => goTo(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
          )}
          {step < STEPS.length ? (
            <Button className="btn-primary w-full sm:flex-none sm:flex-1 rounded-full h-12 text-sm" onClick={() => goTo(step + 1)}>
              Continue <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="btn-primary w-full sm:flex-none sm:flex-1 rounded-full h-12 text-sm">
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
          )}
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default CreateListing;