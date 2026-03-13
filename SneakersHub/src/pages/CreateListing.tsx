import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft, Upload, X, CheckCircle, Tag,
  ChevronDown, FileText, Image,
} from "lucide-react";
import { useListings, Listing } from "@/context/ListingContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PayoutDetailsGuard from "@/components/PayoutDetailsGuard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const categories = ["Running", "Lifestyle", "Basketball", "Outdoor", "Training", "Other"];
const ghanaRegions = [
  "Greater Accra", "Ashanti", "Western", "Central", "Eastern", "Volta",
  "Northern", "North East", "Savannah", "Upper East", "Upper West",
  "Oti", "Bono", "Bono East", "Ahafo", "Western North",
];
const allSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
const brands = ["Nike", "Adidas", "New Balance", "Jordan", "Puma", "Reebok", "Converse", "Vans", "STRIDE", "AERO", "LEGACY", "NOMAD", "Other"];

const CreateListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addListing, updateListing } = useListings();

  const editing = location.state?.listing as Listing | undefined;

  const { user } = useAuth();
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    brand: editing?.brand ?? brands[0],
    price: editing?.price?.toString() ?? "",
    category: editing?.category ?? categories[0],
    description: editing?.description ?? "",
    city: editing?.city ?? "",
    region: editing?.region ?? "",
    shipping_cost: (editing as any)?.shippingCost?.toString() ?? "0",
    handling_time: (editing as any)?.handlingTime ?? "Ships in 1-3 days",
  });

  // Pre-fill city/region and check verified status from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("city, region, verified, is_official").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        if (!editing) {
          setForm((prev) => ({
            ...prev,
            city: prev.city || data.city || "",
            region: prev.region || data.region || "",
          }));
        }
        setIsVerifiedSeller(data.verified === true || data.is_official === true);
      }
    });
  }, [user?.id]);
  const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<number[]>(editing?.sizes ?? []);
  const [images, setImages] = useState<string[]>(editing?.image ? [editing.image] : []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const MAX_IMAGES = 5;
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size].sort((a, b) => a - b)
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    const file = toAdd[0]; // size check on first
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    toAdd.forEach((f) => {
      const r = new FileReader();
      r.onload = () => setImages(prev => [...prev, r.result as string].slice(0, MAX_IMAGES));
      r.readAsDataURL(f);
    });
    setImageFiles(prev => [...prev, ...toAdd].slice(0, MAX_IMAGES));
  };

  const handleSubmit = async () => {
    const { name, brand, price, category, description, city, region, shipping_cost, handling_time } = form;
    if (!name || !brand || !price || !category || !description || !region) {
      toast.error(!region ? "Please select your region" : "Please fill in all fields");
      return;
    }
    if (selectedSizes.length === 0) {
      toast.error("Select at least one size");
      return;
    }
    if (isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Enter a valid price");
      return;
    }
console.log("imageFiles at submit:", imageFiles.length, imageFiles[0]?.name);
    setLoading(true);
    try {
      if (editing) {
        await updateListing(editing.id, {
          name, brand, price: Number(price), category, description, sizes: selectedSizes, city: city || null, region: region || null,
          shippingCost: Number(shipping_cost) || 0, handlingTime: handling_time || "Ships in 1-3 days",
        }, imageFiles[0] ?? undefined, imageFiles.slice(1));
        toast.success("Listing updated!");
      } else {
        await addListing({
          name, brand, price: Number(price), category, description, sizes: selectedSizes, image: null, city: city || null, region: region || null,
          shippingCost: Number(shipping_cost) || 0, handlingTime: handling_time || "Ships in 1-3 days",
        }, imageFiles[0] ?? undefined, imageFiles.slice(1));
        toast.success("Listing published!");
      }
      navigate("/account");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PayoutDetailsGuard>
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* pt-24 +  so content clears navbar + Dynamic Island */}
      <div className="pt-24 section-padding max-w-2xl mx-auto pb-20" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>

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
            {editing ? "Update your listing" : "List a sneaker"}
          </h1>
        </motion.div>

        <div className="space-y-5">

          {/* Image upload */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border p-6">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              <Image className="inline w-3.5 h-3.5 mr-1.5" /> Photo
            </p>

            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
                  <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-contain p-2" />
                  <button
                    onClick={() => {
                      setImages(prev => prev.filter((_, i) => i !== idx));
                      setImageFiles(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-background transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Cover</span>
                  )}
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50
                    flex flex-col items-center justify-center gap-1 transition-colors group">
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <p className="text-[11px] text-muted-foreground">{images.length === 0 ? "Add photo" : "Add more"}</p>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">{images.length}/{MAX_IMAGES} photos · First photo is the cover</p>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
          </motion.div>

          {/* Basic info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border p-6 space-y-4">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <FileText className="inline w-3.5 h-3.5 mr-1.5" /> Details
            </p>

            {/* Name */}
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                Sneaker Name
              </label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Air Jordan 1 Retro High OG"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
            </div>

            {/* Brand + Category row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Brand
                </label>
                <div className="relative">
                  <select name="brand" value={form.brand} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none cursor-pointer">
                    {brands.map((b) => <option key={b}>{b}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select name="category" value={form.category} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none cursor-pointer">
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                Price (GHS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-display font-semibold">₵</span>
                <input name="price" value={form.price} onChange={handleChange} placeholder="0.00" type="number" min="0"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
              </div>
            </div>

            {/* City + Region */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  City
                </label>
                <input name="city" value={form.city} onChange={handleChange} placeholder="e.g. Kumasi"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
              </div>
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Region <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select name="region" value={form.region} onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit] appearance-none cursor-pointer">
                    <option value="">Select region</option>
                    {ghanaRegions.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                Description
              </label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                placeholder="Describe condition, box included, any flaws..."
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  transition-all font-[inherit] resize-none" />
            </div>
          </motion.div>


          {/* Shipping — verified/official sellers only */}
          {isVerifiedSeller && <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="rounded-2xl border border-border p-6">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
              <Tag className="inline w-3.5 h-3.5 mr-1.5" /> Shipping
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Shipping Cost (GHS)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-display font-semibold">₵</span>
                  <input name="shipping_cost" value={form.shipping_cost} onChange={handleChange}
                    placeholder="0" type="number" min="0"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                      placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Set 0 for free shipping</p>
              </div>
              <div>
                <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">
                  Handling Time
                </label>
                <select name="handling_time" value={form.handling_time} onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all appearance-none">
                  <option>Ships in 1-2 days</option>
                  <option>Ships in 1-3 days</option>
                  <option>Ships in 3-5 days</option>
                  <option>Ships in 5-7 days</option>
                  <option>Ships in 1-2 weeks</option>
                </select>
              </div>
            </div>
          </motion.div>}

          {/* Sizes */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Tag className="inline w-3.5 h-3.5 mr-1.5" /> Available Sizes
              </p>
              {selectedSizes.length > 0 && (
                <span className="text-xs text-muted-foreground">{selectedSizes.length} selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allSizes.map((size) => (
                <button key={size} onClick={() => toggleSize(size)}
                  className={`w-12 h-12 rounded-xl text-sm font-display font-semibold transition-all duration-200 border
                    ${selectedSizes.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}>
                  {size}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Button onClick={handleSubmit} disabled={loading} className="btn-primary w-full h-12 rounded-full text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
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
    </PayoutDetailsGuard>
  );
};

export default CreateListing;