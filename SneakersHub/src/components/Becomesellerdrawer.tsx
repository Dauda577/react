import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Store, Phone, MapPin, Instagram, ChevronRight, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

const REGIONS = [
  "Ashanti","Brong-Ahafo","Central","Eastern","Greater Accra",
  "Northern","Upper East","Upper West","Volta","Western",
  "Ahafo","Bono East","Oti","Savannah","North East","Western North",
];

// ✅ FIXED: Detect network based on phone number prefix (handles 0 and 233 prefixes)
const detectNetwork = (number: string): string | null => {
  let cleaned = number.replace(/\D/g, "");
  console.log("Detecting network for number:", cleaned);
  
  // Remove leading 0 or 233 if present to get the core number
  if (cleaned.startsWith("233")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }
  
  console.log("Normalized number:", cleaned);
  
  // Get first 2 digits after normalization
  const prefix = cleaned.slice(0, 2);
  
  // Telecel/Vodafone (formerly Vodafone) - starts with 50
  if (prefix === "50") {
    return "VOD";
  }
  // AirtelTigo - starts with 26, 27
  if (prefix === "26" || prefix === "27") {
    return "ATL";
  }
  // MTN - starts with 54, 55, 59, 24
  if (prefix === "54" || prefix === "55" || prefix === "59" || prefix === "24") {
    return "MTN";
  }
  
  console.log("No network detected for prefix:", prefix);
  return null;
};

const getNetworkName = (number: string) => {
  const network = detectNetwork(number);
  if (network === "VOD") return "Telecel Cash";
  if (network === "ATL") return "AirtelTigo Money";
  if (network === "MTN") return "MTN MoMo";
  return null;
};

export default function BecomeSellerDrawer({ open, onClose }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [form, setForm] = useState({
    store_name: "", store_description: "",
    momo_number: "", momo_name: "",
    city: "", region: "",
    instagram: "", twitter: "", whatsapp: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Auto-resolve account name when momo_number changes
  useEffect(() => {
    const resolveAccountName = async () => {
      const number = form.momo_number.trim();
      if (number.length < 9) {
        setResolvedName(null);
        setResolveError(null);
        setDetectedNetwork(null);
        return;
      }

      const network = detectNetwork(number);
      if (!network) {
        setResolveError("Could not detect network. Please check your number.");
        setResolvedName(null);
        setDetectedNetwork(null);
        return;
      }

      setDetectedNetwork(getNetworkName(number));
      setResolving(true);
      setResolveError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error("No active session");
          setResolveError("Please log in again to verify your account");
          setResolving(false);
          return;
        }
        
        console.log("Calling resolve-account for:", number, "network:", network);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-account`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              account_number: number,
              bank_code: network,
            }),
          }
        );

        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const text = await response.text();
          console.error("Response error:", text);
          setResolveError(`Server error: ${response.status}`);
          setResolvedName(null);
          setResolving(false);
          return;
        }
        
        let result;
        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("JSON parse error:", jsonError);
          setResolveError("Invalid response from server");
          setResolvedName(null);
          setResolving(false);
          return;
        }
        
        console.log("Resolve result:", result);
        
        if (result.success && result.account_name) {
          setResolvedName(result.account_name);
          setForm(f => ({ ...f, momo_name: result.account_name }));
          setResolveError(null);
        } else {
          setResolveError(result.error || "Could not verify account name");
          setResolvedName(null);
        }
      } catch (err) {
        console.error("Resolve error:", err);
        setResolveError("Network error. Please try again.");
        setResolvedName(null);
      } finally {
        setResolving(false);
      }
    };

    const timeoutId = setTimeout(resolveAccountName, 800);
    return () => clearTimeout(timeoutId);
  }, [form.momo_number]);

  const canNext = () => {
    if (step === 0) return form.store_name.trim().length >= 2 && form.store_description.trim().length >= 10;
    if (step === 1) return form.momo_number.trim().length >= 9 && resolvedName !== null && !resolveError;
    if (step === 2) return form.city.trim().length >= 2 && form.region.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("seller_applications").insert({
        user_id: user.id,
        applicant_name: user.name,
        applicant_email: user.email,
        store_name: form.store_name.trim(),
        store_description: form.store_description.trim(),
        momo_number: form.momo_number.trim(),
        momo_name: form.momo_name.trim(),
        city: form.city.trim(),
        region: form.region,
        instagram: form.instagram.trim() || null,
        twitter: form.twitter.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      setStep(4);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(0);
      setForm({ store_name:"",store_description:"",momo_number:"",momo_name:"",city:"",region:"",instagram:"",twitter:"",whatsapp:"" });
      setResolvedName(null);
      setResolveError(null);
      setDetectedNetwork(null);
    }, 400);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background border-l border-border flex flex-col shadow-2xl"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-sm">Start Selling</p>
                  {step < 4 && <p className="text-[11px] text-muted-foreground">Step {step + 1} of 4</p>}
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            {step < 4 && (
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${((step + 1) / 4) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AnimatePresence mode="wait">

                {/* Step 0 — Store info */}
                {step === 0 && (
                  <motion.div key="s0" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-5">
                    <div>
                      <h2 className="font-display font-bold text-xl">Your Store</h2>
                      <p className="text-sm text-muted-foreground mt-1">Tell buyers who you are and what you sell.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Name *</label>
                        <input
                          value={form.store_name}
                          onChange={e => set("store_name", e.target.value)}
                          placeholder="e.g. Style House GH"
                          className="w-full mt-1.5 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store Description *</label>
                        <textarea
                          value={form.store_description}
                          onChange={e => set("store_description", e.target.value)}
                          placeholder="What do you sell? e.g. sneakers, watches, streetwear — your specialty, brands you stock, years of experience..."
                          rows={4}
                          className="w-full mt-1.5 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">{form.store_description.length} chars · min 10</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 1 — Payment */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-5">
                    <div>
                      <h2 className="font-display font-bold text-xl">Payment Details</h2>
                      <p className="text-sm text-muted-foreground mt-1">Your MoMo number for receiving payouts.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">MoMo Number *</label>
                        <div className="flex mt-1.5">
                          <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-sm text-muted-foreground">+233</span>
                          <input
                            value={form.momo_number}
                            onChange={e => set("momo_number", e.target.value.replace(/\D/g,""))}
                            placeholder="024 000 0000"
                            maxLength={10}
                            className="flex-1 px-4 py-3 rounded-r-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                        {/* Show detected network */}
                        {form.momo_number.length >= 9 && detectNetwork(form.momo_number) && (
                          <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Network detected: {getNetworkName(form.momo_number)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Name</label>
                        <div className="relative mt-1.5">
                          <input
                            value={form.momo_name}
                            onChange={e => set("momo_name", e.target.value)}
                            placeholder={resolving ? "Verifying account..." : "Auto-verified from MoMo number"}
                            disabled={true}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
                          />
                          {resolving && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                          )}
                          {resolvedName && !resolveError && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          )}
                        </div>
                        
                        {/* Resolve status messages */}
                        {resolveError && (
                          <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {resolveError}
                          </p>
                        )}
                        {resolvedName && !resolveError && (
                          <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Account verified: {resolvedName}
                          </p>
                        )}
                        {!resolvedName && !resolveError && form.momo_number.length >= 9 && !resolving && (
                          <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Verifying account name...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                      <p className="text-xs text-blue-600">
                        💡 After admin approval, you'll pay a one-time <strong>GHS 50</strong> verification fee. Your sales proceeds go to this MoMo number.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 2 — Location */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-5">
                    <div>
                      <h2 className="font-display font-bold text-xl">Your Location</h2>
                      <p className="text-sm text-muted-foreground mt-1">Helps buyers find sellers near them.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City / Town *</label>
                        <input
                          value={form.city}
                          onChange={e => set("city", e.target.value)}
                          placeholder="e.g. Kumasi"
                          className="w-full mt-1.5 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Region *</label>
                        <select
                          value={form.region}
                          onChange={e => set("region", e.target.value)}
                          className="w-full mt-1.5 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        >
                          <option value="">Select region...</option>
                          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 — Social + summary */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} className="space-y-5">
                    <div>
                      <h2 className="font-display font-bold text-xl">Social Links</h2>
                      <p className="text-sm text-muted-foreground mt-1">Optional — builds trust with buyers.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Instagram className="w-3 h-3" /> Instagram
                        </label>
                        <div className="flex mt-1.5">
                          <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-sm text-muted-foreground">@</span>
                          <input
                            value={form.instagram}
                            onChange={e => set("instagram", e.target.value)}
                            placeholder="yourhandle"
                            className="flex-1 px-4 py-3 rounded-r-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</label>
                        <div className="flex mt-1.5">
                          <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-sm text-muted-foreground">+233</span>
                          <input
                            value={form.whatsapp}
                            onChange={e => set("whatsapp", e.target.value.replace(/\D/g,""))}
                            placeholder="024 000 0000"
                            maxLength={10}
                            className="flex-1 px-4 py-3 rounded-r-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">X (Twitter)</label>
                        <div className="flex mt-1.5">
                          <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-border bg-muted text-sm text-muted-foreground">@</span>
                          <input
                            value={form.twitter}
                            onChange={e => set("twitter", e.target.value)}
                            placeholder="yourhandle"
                            className="flex-1 px-4 py-3 rounded-r-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summary</p>
                      <p className="text-sm font-bold font-display">{form.store_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> +233{form.momo_number} · {form.momo_name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> {form.city}, {form.region}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Step 4 — Success */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }}
                    className="flex flex-col items-center text-center py-10 space-y-5">
                    <motion.div
                      initial={{ scale:0 }} animate={{ scale:1 }}
                      transition={{ type:"spring", delay:0.15 }}
                      className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
                    >
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </motion.div>
                    <div>
                      <h2 className="font-display font-bold text-2xl">Application Sent!</h2>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                        We're reviewing your store details. Once approved, you'll receive a link to pay the GHS 50 verification fee and unlock your seller dashboard.
                      </p>
                    </div>
                    <div className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-left">
                      <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Under Review</p>
                        <p className="text-xs text-amber-600 mt-0.5">Typically 1–2 business days.</p>
                      </div>
                    </div>
                    <Button className="w-full rounded-xl" onClick={handleClose}>Done</Button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            {step < 4 && (
              <div className="px-6 py-4 border-t border-border flex gap-3">
                {step > 0 && (
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(s => s - 1)}>
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button className="flex-1 rounded-xl" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button className="flex-1 rounded-xl" disabled={submitting} onClick={handleSubmit}>
                    {submitting
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                      : "Submit Application"
                    }
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}