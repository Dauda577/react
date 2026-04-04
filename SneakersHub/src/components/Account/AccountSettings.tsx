import React, { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Shield, Lock, Trash, ChevronRight, Wallet, CreditCard,
  CheckCircle, AlertTriangle, Share, Moon, Sun, Store, Clock, X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { fadeUp } from "../Account/accountHelpers";
import BecomeSellerDrawer from "@/components/Becomesellerdrawer";

const isSafari = () =>
  typeof navigator !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true);

const REGIONS = [
  "Ashanti","Brong-Ahafo","Central","Eastern","Greater Accra",
  "Northern","Upper East","Upper West","Volta","Western",
  "Ahafo","Bono East","Oti","Savannah","North East","Western North",
];

// ── Notification settings block ───────────────────────────────────────────────
const NotificationSettings = ({
  pushSupported, pushPermission, requestPermission,
}: {
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
}) => {
  const safari = isSafari() || isIOS();
  const standalone = isStandalone();

  if (safari && !standalone) return (
    <div className="px-5 py-4 flex items-start gap-3 bg-blue-500/5 border-b border-border">
      <Share className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">Enable Notifications on Safari</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Tap <span className="font-semibold text-blue-500">Share</span> then{" "}
          <span className="font-semibold">"Add to Home Screen"</span> — then reopen from your home screen.
        </p>
      </div>
    </div>
  );
  if (!pushSupported) return (
    <div className="px-5 py-3 border-b border-border">
      <p className="text-xs text-muted-foreground">Push notifications not supported. Try Chrome or Firefox.</p>
    </div>
  );
  if (pushPermission === "default") return (
    <div className="px-5 py-4 flex items-center justify-between gap-4 bg-primary/5 border-b border-border">
      <div>
        <p className="text-sm font-semibold text-primary">Enable Push Notifications</p>
        <p className="text-xs text-muted-foreground mt-0.5">Get notified about orders and messages</p>
      </div>
      <button
        onClick={async () => {
          const granted = await requestPermission();
          if (granted) toast.success("Notifications enabled!");
          else toast("Enable in your browser settings.");
        }}
        className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0 hover:opacity-90 transition-opacity"
      >
        Enable
      </button>
    </div>
  );
  if (pushPermission === "denied") return (
    <div className="px-5 py-4 flex items-start gap-3 bg-muted/30 border-b border-border">
      <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">Notifications Blocked</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Go to your browser's site settings and set Notifications to Allow.
        </p>
      </div>
    </div>
  );
  if (pushPermission === "granted") return (
    <div className="px-5 py-3 flex items-center gap-2 bg-green-500/5 border-b border-border">
      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
      <p className="text-xs text-green-600 font-medium">Push notifications are active</p>
    </div>
  );
  return null;
};

// ── Payout change confirmation modal ─────────────────────────────────────────
const PayoutConfirmModal = ({
  open, oldNumber, oldName, newNumber, newName, onConfirm, onCancel,
}: {
  open: boolean;
  oldNumber: string;
  oldName: string;
  newNumber: string;
  newName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <AnimatePresence>
    {open && (
      // Backdrop fills the whole viewport and centres its child with flexbox
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        {/* Modal card — stopPropagation keeps clicks inside from closing */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-display font-bold text-base">Update Payout Account?</p>
              <p className="text-xs text-muted-foreground mt-0.5">This will change where your sales are sent</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1">
              <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Current</p>
              <p className="font-medium text-foreground">{oldName || "—"}</p>
              <p className="text-muted-foreground">
                {oldNumber ? `+233${oldNumber.replace(/^0/, "").replace(/^233/, "")}` : "—"}
              </p>
            </div>
            <div className="flex justify-center">
              <ChevronRight className="w-4 h-4 text-muted-foreground rotate-90" />
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <p className="text-amber-600 font-semibold uppercase tracking-wider text-[10px]">New</p>
              <p className="font-medium text-foreground">{newName || "—"}</p>
              <p className="text-muted-foreground">
                {newNumber ? `+233${newNumber.replace(/^0/, "").replace(/^233/, "")}` : "—"}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Future payouts will go to the new account. This will also update your Paystack subaccount immediately.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
            >
              Yes, Update
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ── Seller application status card ────────────────────────────────────────────
const SellerApplicationStatus = ({ userId, userEmail, onActivated }: {
  userId?: string;
  userEmail?: string;
  onActivated?: () => void;
}) => {
  const [status, setStatus] = useState<string | null>(null);
  const [appData, setAppData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  React.useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase.from("seller_applications")
      .select("status, store_name, momo_number, momo_name")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setAppData(data); setStatus(data?.status ?? null); setLoading(false); });
  }, [userId]);

  const ensurePaystackScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if ((window as any).PaystackPop) { resolve(); return; }
      const existing = document.querySelector('script[src*="paystack"]');
      let attempts = 0;
      const poll = setInterval(() => {
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); return; }
        if (++attempts > 20) { clearInterval(poll); reject(new Error("Paystack SDK not available")); }
      }, 300);
      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.async = true;
        document.head.appendChild(script);
      }
    });

  const handlePay = async () => {
    if (!userId || !userEmail || !appData) return;
    setPaying(true);
    try {
      const existing = document.querySelectorAll('div[id^="paystack-iframe-container"]');
      existing.forEach(el => el.remove());
      document.body.classList.remove("paystack-open");
      await ensurePaystackScript();
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) throw new Error("Payment SDK not available");
      const ref = `verify_${Date.now()}_${userId.slice(0, 6)}`;
      if (window.innerWidth < 768) {
        document.body.style.overflow = "hidden";
        document.body.classList.add("paystack-open");
      }
      const handler = PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? "pk_live_9e1705a04e21f148e758dc11c1e920ed6393702b",
        email: userEmail,
        amount: 5000,
        currency: "GHS",
        ref,
        channels: ["card", "mobile_money"],
        metadata: { custom_fields: [{ display_name: "Purpose", variable_name: "purpose", value: "seller_verification" }] },
        callback: (response: { reference: string }) => {
          document.body.style.overflow = "";
          document.body.classList.remove("paystack-open");
          const ref = response.reference;
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const num = appData.momo_number?.replace(/\D/g, "").replace(/^0/, "").replace(/^233/, "");
              const settlementBank = num?.startsWith("50") ? "VOD" : (num?.startsWith("26") || num?.startsWith("27")) ? "ATL" : "MTN";
              const res = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subaccount`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`,
                    "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
                  },
                  body: JSON.stringify({
                    seller_id: userId, paystack_reference: ref,
                    settlement_bank: settlementBank, account_number: appData.momo_number,
                    account_name: appData.momo_name, percentage_charge: 5,
                  }),
                }
              );
              const result = await res.json();
              if (result.success) {
                await supabase.from("seller_applications").update({ status: "paid" }).eq("user_id", userId);
                await supabase.from("profiles").update({ role: "seller", is_seller: true, verified: true }).eq("id", userId);
                setStatus("paid");
                toast.success("You're now a verified seller! Refresh to access your seller dashboard.", { duration: 8000 });
                onActivated?.();
                setTimeout(() => window.location.reload(), 2000);
              } else throw new Error(result.error ?? "Verification failed");
            } catch (err: any) {
              toast.error(err.message ?? `Payment went through but setup failed. Contact support with ref: ${ref}`, { duration: 10000 });
            } finally { setPaying(false); }
          }, 0);
        },
        onClose: () => {
          document.body.style.overflow = "";
          document.body.classList.remove("paystack-open");
          setPaying(false);
          toast("Payment cancelled — tap the button again when you're ready.");
        },
      });
      setTimeout(() => handler.openIframe(), 300);
    } catch (err: any) {
      document.body.style.overflow = "";
      document.body.classList.remove("paystack-open");
      toast.error(err.message ?? "Could not start payment");
      setPaying(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
        <Store className="w-4 h-4 text-primary" />
        <p className="font-display font-semibold text-sm">Sell on SneakersHub</p>
      </div>
      <div className="px-5 py-5 space-y-4">
        {status === null && (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Turn your collection into cash. Apply to become a seller — our team reviews applications within 24 hours.
            </p>
            <button onClick={() => setDrawerOpen(true)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <Store className="w-4 h-4" /> Apply to Sell
            </button>
          </>
        )}
        {status === "pending" && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Application Under Review</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Our team is reviewing your store details. You'll be notified by SMS once approved — usually within 24 hours.
              </p>
            </div>
          </div>
        )}
        {status === "approved" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Application Approved!</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Pay the GHS 50 one-time verification fee to activate your seller account.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-3 text-xs text-green-700 space-y-1">
              <p>Sales go directly to: <strong>+233{appData?.momo_number} ({appData?.momo_name})</strong></p>
              <p>One-time fee, no monthly charges</p>
              <p>Verified badge on all your listings</p>
            </div>
            <button onClick={handlePay} disabled={paying}
              className="w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
              {paying
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                : <><ShieldCheck className="w-4 h-4" /> Pay GHS 50 &amp; Activate Account</>
              }
            </button>
          </div>
        )}
        {status === "rejected" && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Application Not Approved</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Unfortunately your application wasn't approved. You're welcome to re-apply with more details.
              </p>
              <button onClick={() => setDrawerOpen(true)}
                className="mt-3 w-full py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted/30 transition-colors">
                Re-apply
              </button>
            </div>
          </div>
        )}
        {status === "paid" && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Setting up your account...</p>
              <p className="text-xs text-muted-foreground mt-1">Payment received. Refreshing your dashboard...</p>
            </div>
          </div>
        )}
      </div>
      <BecomeSellerDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setStatus("pending"); }} />
    </div>
  );
};

interface Props {
  user: any;
  canSell: boolean;
  isOfficial: boolean;
  isVerified: boolean;
  subaccountCode: string | null;
  hasMissingPayoutDetails: boolean;
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  onDeleteAccount: () => void;
}

const AccountSettings = memo(({
  user, canSell, isOfficial, isVerified, subaccountCode,
  hasMissingPayoutDetails, pushSupported, pushPermission, requestPermission,
  onDeleteAccount,
}: Props) => {
  const { theme, toggleTheme } = useTheme();

  const [notifOrders,     setNotifOrders]     = useState(() => localStorage.getItem("notif_orders") !== "false");
  const [notifMessages,   setNotifMessages]   = useState(() => localStorage.getItem("notif_messages") !== "false");
  const [notifPromotions, setNotifPromotions] = useState(() => localStorage.getItem("notif_promotions") === "true");
  const [showDeleteConfirm,   setShowDeleteConfirm]   = useState(false);
  const [showChangePassword,  setShowChangePassword]  = useState(false);
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Payout state — savedPayout holds what's in DB, payoutForm holds live edits
  const [savedPayout,       setSavedPayout]       = useState({ method: "", number: "", name: "" });
  const [payoutForm,        setPayoutForm]        = useState({ method: "", number: "", name: "", bankCode: "" });
  const [payoutSaved,       setPayoutSaved]       = useState(false);
  const [showPayoutConfirm, setShowPayoutConfirm] = useState(false);

  // Load saved payout details and pre-fill form so fields are never blank
  React.useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles")
      .select("payout_method, payout_number, payout_name")
      .eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.payout_method) {
          const loaded = { method: data.payout_method, number: data.payout_number ?? "", name: data.payout_name ?? "" };
          setSavedPayout(loaded);
          setPayoutForm({ ...loaded, bankCode: "" });
        }
      });
  }, [user?.id]);

  const toggleNotif = (key: string, value: boolean, set: (v: boolean) => void) => {
    set(value);
    localStorage.setItem(key, String(value));
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setShowChangePassword(false); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) { toast.error(err.message ?? "Failed to update password"); }
  };

  // Shows confirmation modal only when there are real existing saved payout details to compare against
  const handleSavePayoutIntent = () => {
    if (!payoutForm.method || !payoutForm.number || !payoutForm.name) {
      toast.error("Please fill in all payout details"); return;
    }
    if (isVerified && subaccountCode && savedPayout.number) {
      setShowPayoutConfirm(true);
      return;
    }
    executeSavePayout();
  };

  // The actual DB + Paystack save — called directly or after modal confirmation
  const executeSavePayout = async () => {
    setShowPayoutConfirm(false);
    try {
      const { error } = await supabase.from("profiles").update({
        payout_method: payoutForm.method, payout_number: payoutForm.number,
        payout_name: payoutForm.name, payout_bank_code: payoutForm.bankCode || null,
      }).eq("id", user!.id);
      if (error) throw error;

      if (isVerified && subaccountCode) {
        try {
          const settlementBank = payoutForm.method === "momo_telecel" ? "VOD"
            : payoutForm.method === "momo_airteltigo" ? "ATL" : "MTN";
          let num = payoutForm.number.replace(/\s+/g, "");
          if (num.startsWith("233")) num = "0" + num.slice(3);
          if (!num.startsWith("0")) num = "0" + num;
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-subaccount`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
              "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              seller_id: user!.id, subaccount_code: subaccountCode,
              settlement_bank: settlementBank, account_number: num,
            }),
          });
          toast.success("Payout details updated — Paystack subaccount synced!");
        } catch {
          toast.success("Payout details saved! (Paystack sync failed — contact support)");
        }
      } else {
        toast.success("Payout details saved!");
      }

      // Update saved snapshot so future modal comparisons are always accurate
      setSavedPayout({ method: payoutForm.method, number: payoutForm.number, name: payoutForm.name });
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 3000);
    } catch (err: any) { toast.error(err.message ?? "Failed to save payout details"); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Payout change confirmation modal — rendered at top level so it overlays everything */}
      <PayoutConfirmModal
        open={showPayoutConfirm}
        oldNumber={savedPayout.number}
        oldName={savedPayout.name}
        newNumber={payoutForm.number}
        newName={payoutForm.name}
        onConfirm={executeSavePayout}
        onCancel={() => setShowPayoutConfirm(false)}
      />

      {/* Become a seller card — non-sellers only */}
      {!canSell && (
        <SellerApplicationStatus
          userId={user?.id}
          userEmail={user?.email}
          onActivated={() => window.location.reload()}
        />
      )}

      {/* Notifications */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          <Bell className="w-4 h-4 text-primary" />
          <p className="font-display font-semibold text-sm">Notifications</p>
        </div>
        <div className="divide-y divide-border">
          <NotificationSettings
            pushSupported={pushSupported}
            pushPermission={pushPermission}
            requestPermission={requestPermission}
          />
          {[
            { label: "Order updates",  sub: "Confirmations, dispatch and delivery", key: "notif_orders",     value: notifOrders,     set: setNotifOrders },
            { label: "Messages",       sub: "Replies from buyers or sellers",       key: "notif_messages",   value: notifMessages,   set: setNotifMessages },
            { label: "Promotions",     sub: "Deals, new arrivals and boosts",       key: "notif_promotions", value: notifPromotions, set: setNotifPromotions },
          ].map(({ label, sub, key, value, set }) => (
            <div key={label} className="flex items-center justify-between px-5 py-4 gap-4">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <button
                onClick={() => toggleNotif(key, !value, set)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${value ? "bg-primary" : "bg-border"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          {theme === "light" ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
          <p className="font-display font-semibold text-sm">Appearance</p>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark mode</p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-14 h-8 rounded-full bg-muted border border-border flex items-center px-1 transition-colors duration-200"
            >
              <div className={`absolute w-6 h-6 rounded-full bg-background shadow-md flex items-center justify-center transition-transform duration-200 ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`}>
                {theme === "dark"
                  ? <Moon className="w-3.5 h-3.5 text-primary" />
                  : <Sun className="w-3.5 h-3.5 text-amber-500" />
                }
              </div>
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { id: "light", Icon: Sun,  label: "Light", sub: "Default",        iconClass: "text-amber-500" },
              { id: "dark",  Icon: Moon, label: "Dark",  sub: "Easier on eyes", iconClass: "text-primary"   },
            ].map(({ id, Icon, label, sub, iconClass }) => (
              <div key={id} className={`p-3 rounded-xl border transition-all ${theme === id ? "border-primary bg-primary/5" : "border-border"}`}>
                <Icon className={`w-4 h-4 mb-1 ${theme === id ? iconClass : "text-muted-foreground"}`} />
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payout details — verified sellers only, not official */}
      {canSell && !isOfficial && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
            <Wallet className="w-4 h-4 text-primary" />
            <p className="font-display font-semibold text-sm">Payout Details</p>
          </div>
          <div className="p-5 space-y-4">
            {isVerified && hasMissingPayoutDetails && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-600">Required — add these to receive your payouts.</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isVerified && subaccountCode
                ? <>95% of every sale goes directly to your MoMo/bank via Paystack split. <span className="font-semibold text-foreground">SneakersHub keeps 5%</span> automatically.</>
                : <>Add your payout details below. <span className="font-semibold text-foreground">SneakersHub takes 5% commission</span> per sale.</>
              }
              {!isVerified && <span className="block mt-1 text-[11px]">Only applies when you become a verified seller.</span>}
            </p>

            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-2">Payout Method</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "momo_mtn",       label: "MTN MoMo"     },
                  { value: "momo_telecel",    label: "Telecel Cash" },
                  { value: "momo_airteltigo", label: "AirtelTigo"  },
                ] as const).map(({ value, label }) => (
                  <button key={value} onClick={() => setPayoutForm(p => ({ ...p, method: value, bankCode: "" }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all text-xs font-semibold
                      ${payoutForm.method === value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    <CreditCard className={`w-4 h-4 ${payoutForm.method === value ? "text-primary" : ""}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">MoMo Number</label>
              <input
                value={payoutForm.number}
                onChange={e => setPayoutForm(p => ({ ...p, number: e.target.value }))}
                placeholder="0244 000 000"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
              />
            </div>
            <div>
              <label className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1.5">Account Name</label>
              <input
                value={payoutForm.name}
                onChange={e => setPayoutForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Name on account"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]"
              />
            </div>

            <Button className="btn-primary rounded-full h-9 px-5 text-sm w-full" onClick={handleSavePayoutIntent}>
              {payoutSaved ? <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Saved!</> : "Save Payout Details"}
            </Button>
          </div>
        </div>
      )}

      {/* Privacy & Security */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          <Shield className="w-4 h-4 text-primary" />
          <p className="font-display font-semibold text-sm">Privacy &amp; Security</p>
        </div>
        <div className="divide-y divide-border">
          {/* Change password */}
          <div className="px-5 py-4">
            <button onClick={() => setShowChangePassword(!showChangePassword)} className="w-full flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="text-left">
                  <p className="text-sm font-medium">Change password</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Update your account password</p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showChangePassword ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showChangePassword && (
                <motion.div {...fadeUp} className="overflow-hidden">
                  <div className="pt-4 space-y-3">
                    <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                    <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-[inherit]" />
                    <Button className="btn-primary rounded-full h-9 px-5 text-sm" onClick={handleChangePassword}>Update Password</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Delete account */}
          <div className="px-5 py-4">
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 group">
                <Trash className="w-4 h-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
                <div className="text-left">
                  <p className="text-sm font-medium group-hover:text-red-500 transition-colors">Delete account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and data</p>
                </div>
              </button>
            ) : (
              <motion.div {...fadeUp} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-sm font-bold text-red-500">Delete Account</p>
                </div>
                <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-2">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">This will permanently delete:</p>
                  <div className="space-y-1.5 mt-2">
                    {[
                      "Your profile and personal information",
                      "All your active and past listings",
                      "Your saved items and preferences",
                      "Access to all your order history",
                      "Your messages and conversations",
                    ].map(item => (
                      <div key={item} className="flex items-start gap-2">
                        <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">x</span>
                        <p className="text-xs text-muted-foreground">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This action is <span className="font-semibold text-foreground">permanent and cannot be undone</span>.
                </p>
                <div className="flex gap-2">
                  <button onClick={onDeleteAccount}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                    Yes, delete forever
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">SneakersHub v1.0 · Made in Ghana</p>
    </div>
  );
});

AccountSettings.displayName = "AccountSettings";
export default AccountSettings;