import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Send, Users, UserPlus, Store, BadgeCheck, RefreshCw, CheckCircle2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type RecipientUser = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  is_seller: boolean;
  verified: boolean;
};

type SegmentKey = "all_users" | "sellers" | "buyers" | "verified_sellers";

const SEGMENTS: { key: SegmentKey; label: string; icon: React.ReactNode }[] = [
  { key: "all_users", label: "All Users", icon: <Users className="w-4 h-4" /> },
  { key: "sellers", label: "Sellers", icon: <Store className="w-4 h-4" /> },
  { key: "buyers", label: "Buyers", icon: <UserPlus className="w-4 h-4" /> },
  { key: "verified_sellers", label: "Verified Sellers", icon: <BadgeCheck className="w-4 h-4" /> },
];

const MAX_CHARS = 1600;

// ── Component ─────────────────────────────────────────────────────────────────

export const MessagingTab = () => {
  const [recipients, setRecipients] = useState<RecipientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>("all_users");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchRecipients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, phone, role, is_seller, verified");
    if (data) setRecipients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  // ── Segment helpers ────────────────────────────────────────────────────────

  const segmentMatches = (u: RecipientUser, seg: SegmentKey): boolean => {
    switch (seg) {
      case "all_users":
        return true;
      case "sellers":
        return u.is_seller || u.role === "seller";
      case "buyers":
        return !(u.is_seller || u.role === "seller");
      case "verified_sellers":
        return (u.is_seller || u.role === "seller") && u.verified;
    }
  };

  const segmentUsers = (seg: SegmentKey) =>
    recipients.filter((u) => segmentMatches(u, seg) && u.phone);

  const selectedUsers = selectedSegment
    ? segmentUsers(selectedSegment)
    : recipients.filter((u) => selectedIds.has(u.id));

  const toggleIndividual = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Send ───────────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!message.trim()) {
      toast.error("Enter a message first");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("No recipients selected");
      return;
    }

    setSending(true);
    try {
      const res = await apiPost<{ sent: number; failed: number }>("/api/admin/broadcast-sms", {
        message: message.trim(),
        recipient_ids: selectedUsers.map((u) => u.id),
      });
      toast.success(
        res.failed === 0
          ? `Message sent to ${res.sent} recipients`
          : `Sent to ${res.sent}, failed: ${res.failed}`
      );
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
    setSending(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 mt-5">

      {/* Recipient targeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Recipients
          </h3>
          <button onClick={fetchRecipients} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Segment chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {SEGMENTS.map((seg) => {
            const count = loading ? null : segmentUsers(seg.key).length;
            const active = selectedSegment === seg.key;
            return (
              <button
                key={seg.key}
                onClick={() => setSelectedSegment(seg.key)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {seg.icon}
                {seg.label}
                {count !== null && (
                  <span className="text-[11px] text-muted-foreground">{count} with phone</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Individual picker */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading users...</p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {recipients.filter((u) => u.phone).map((u) => {
              const checked = selectedIds.has(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleIndividual(u.id)}
                    className="rounded border-border text-primary"
                  />
                  <span className="text-sm font-medium flex-1">{u.name}</span>
                  {(u.is_seller || u.role === "seller") && (
                    <BadgeCheck className={`w-3.5 h-3.5 ${u.verified ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                  <span className="text-xs text-muted-foreground">{u.phone}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span>
            {selectedSegment
              ? `${selectedUsers.length} recipient${selectedUsers.length !== 1 ? "s" : ""} selected via "${SEGMENTS.find((s) => s.key === selectedSegment)!.label}"`
              : `${selectedUsers.length} recipient${selectedUsers.length !== 1 ? "s" : ""} selected individually`}
          </span>
        </div>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border p-6"
      >
        <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" /> Message (SMS)
        </h3>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_CHARS}
          rows={4}
          placeholder="Type your broadcast message here... e.g. New arrivals are live! Use code SALE10 for 10% off."
          className="w-full px-3 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-muted-foreground">
            {message.length}/{MAX_CHARS} characters
          </span>
          <Button onClick={sendMessage} disabled={sending} className="btn-primary rounded-full">
            {sending
              ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              : <Send className="w-4 h-4 mr-2" />
            }
            Send to {selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};