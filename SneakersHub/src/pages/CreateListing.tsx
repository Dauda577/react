import { useState, useRef } from "react";
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

const categories = ["Running", "Lifestyle", "Basketball", "Outdoor", "Training", "Other"];
const allSizes = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
const brands = ["Nike", "Adidas", "New Balance", "Jordan", "Puma", "Reebok", "Converse", "Vans", "STRIDE", "AERO", "LEGACY", "NOMAD", "Other"];

const CreateListing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addListing, updateListing } = useListings();

  const editing = location.state?.listing as Listing | undefined;

  const [form, setForm] = useState({
    name: editing?.name ?? "",
    brand: editing?.brand ?? brands[0],
    price: editing?.price?.toString() ?? "",
    category: editing?.category ?? categories[0],
    description: editing?.description ?? "",
  });
  const [selectedSizes, setSelectedSizes] = useState<number[]>(editing?.sizes ?? []);
  const [image, setImage] = useState<string | null>(editing?.image ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    setImageFile(file);
  };

  const handleSubmit = async () => {
    const { name, brand, price, category, description } = form;
    if (!name || !brand || !price || !category || !description) {
      toast.error("Please fill in all fields");
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

    setLoading(true);
    try {
      if (editing) {
        await updateListing(editing.id, {
          name, brand, price: Number(price), category, description, sizes: selectedSizes,
        }, imageFile ?? undefined);
        toast.success("Listing updated!");
      } else {
        await addListing({
          name, brand, price: Number(price), category, description, sizes: selectedSizes, image: null,
        }, imageFile ?? undefined);
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

      {/* pt-24 + pwa-offset-24 so content clears navbar + Dynamic Island */}
      <div className="pt-24 pwa-offset-24 section-padding max-w-2xl mx-auto pb-20">

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

            {image ? (
              <div className="relative w-full aspect-square max-w-xs mx-auto rounded-xl overflow-hidden bg-secondary">
                <img src={image} alt="Listing" className="w-full h-full object-contain p-4" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video max-h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50
                  flex flex-col items-center justify-center gap-3 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Click to upload photo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                </div>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
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