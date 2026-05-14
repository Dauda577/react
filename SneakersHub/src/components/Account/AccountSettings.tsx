import React, { memo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Shield, Lock, Trash, ChevronRight,
  CheckCircle, Share, Moon, Sun, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { fadeUp } from "../Account/accountHelpers";

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

const NotificationSettings = memo(({
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
        <p className="text-xs text-muted-foreground mt-0.5">Get notified about new messages and boosts</p>
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
});

NotificationSettings.displayName = "NotificationSettings";

const DeleteAccountModal = memo(({
  open, onConfirm, onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-5"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Trash className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-display font-bold text-base text-red-500">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
            </div>
          </div>

          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-2">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">This will permanently delete:</p>
            <div className="space-y-1.5 mt-2">
              {[
                "Your profile and personal information",
                "All your active and past listings",
                "Your saved items and preferences",
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <X className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            This action is <span className="font-semibold text-foreground">permanent and cannot be undone</span>.
            All your data will be completely removed from our servers.
          </p>

          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/40 transition-colors">
              Cancel
            </button>
            <button onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
              Yes, delete forever
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
));

DeleteAccountModal.displayName = "DeleteAccountModal";

interface Props {
  user: any;
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  onDeleteAccount: () => void;
}

const AccountSettings = memo(({
  user, pushSupported, pushPermission, requestPermission, onDeleteAccount,
}: Props) => {
  const { theme, toggleTheme } = useTheme();

  const [notifListings, setNotifListings] = useState(() => localStorage.getItem("notif_listings") !== "false");
  const [notifPromotions, setNotifPromotions] = useState(() => localStorage.getItem("notif_promotions") === "true");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const toggleNotif = useCallback((key: string, value: boolean, set: (v: boolean) => void) => {
    set(value);
    localStorage.setItem(key, String(value));
  }, []);

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    }
  }, [newPassword, confirmPassword]);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteModal(false);
    onDeleteAccount();
  }, [onDeleteAccount]);

  return (
    <div className="space-y-6 max-w-lg">
      <DeleteAccountModal
        open={showDeleteModal}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />

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
            { label: "New listings", sub: "Items matching your saved searches", key: "notif_listings", value: notifListings, set: setNotifListings },
            { label: "Promotions", sub: "Deals and featured listings", key: "notif_promotions", value: notifPromotions, set: setNotifPromotions },
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
              { id: "light", Icon: Sun, label: "Light", sub: "Default", iconClass: "text-amber-500" },
              { id: "dark", Icon: Moon, label: "Dark", sub: "Easier on eyes", iconClass: "text-primary" },
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

      {/* Privacy & Security */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/20">
          <Shield className="w-4 h-4 text-primary" />
          <p className="font-display font-semibold text-sm">Privacy &amp; Security</p>
        </div>
        <div className="divide-y divide-border">
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

          <div className="px-5 py-4">
            <button onClick={() => setShowDeleteModal(true)} className="w-full flex items-center gap-3 group">
              <Trash className="w-4 h-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
              <div className="text-left">
                <p className="text-sm font-medium group-hover:text-red-500 transition-colors">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and data</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">Made in Ghana 🇬🇭</p>
    </div>
  );
});

AccountSettings.displayName = "AccountSettings";
export default AccountSettings;