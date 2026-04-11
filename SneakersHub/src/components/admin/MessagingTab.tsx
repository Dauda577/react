import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare, Mail, Users, UserCheck,
    Send, CheckCircle, Search, Loader2,
    SlidersHorizontal, Phone, AtSign, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type Recipient = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    role: string | null;
    is_seller: boolean;
    verified: boolean;
    is_official: boolean;
};

type Channel = "sms" | "email";
type RecipientMode = "all" | "individual" | "segment";
type Segment = "all_users" | "sellers" | "buyers" | "verified_sellers";

const SEGMENTS: { value: Segment; label: string; desc: string }[] = [
    { value: "all_users", label: "All Users", desc: "Every registered customer" },
    { value: "sellers", label: "All Sellers", desc: "Users with seller role" },
    { value: "buyers", label: "All Buyers", desc: "Users with buyer role" },
    { value: "verified_sellers", label: "Verified Sellers", desc: "Verified or official sellers" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export const MessagingTab = () => {
    const [channel, setChannel] = useState<Channel>("sms");
    const [mode, setMode] = useState<RecipientMode>("all");
    const [segment, setSegment] = useState<Segment>("all_users");
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentResult, setSentResult] = useState<{ sent: number; failed: number } | null>(null);

    // ── Fetch all non-unsubscribed profiles ───────────────────────────────────
    const fetchRecipients = useCallback(async () => {
        setLoadingRecipients(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, name, phone, email, role, is_seller, verified, is_official, marketing_unsubscribed")
                .eq("marketing_unsubscribed", false)
                .order("name");
            if (error) throw error;
            setRecipients(
                (data ?? []).map((p: any) => ({
                    id: p.id,
                    name: p.name ?? "Unknown",
                    phone: p.phone ?? null,
                    email: p.email ?? null,
                    role: p.role ?? null,
                    is_seller: p.is_seller ?? false,
                    verified: p.verified ?? false,
                    is_official: p.is_official ?? false,
                }))
            );
        } catch {
            toast.error("Failed to load recipients");
        } finally {
            setLoadingRecipients(false);
        }
    }, []);

    useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

    // ── Who actually receives the message ─────────────────────────────────────
    const effectiveRecipients = (() => {
        let pool = recipients;
        if (mode === "individual") {
            pool = recipients.filter(r => selectedIds.has(r.id));
        } else if (mode === "segment") {
            if (segment === "sellers") pool = recipients.filter(r => r.role === "seller" || r.is_seller);
            if (segment === "buyers") pool = recipients.filter(r => r.role === "buyer");
            if (segment === "verified_sellers") pool = recipients.filter(r => r.verified || r.is_official);
        }
        if (channel === "sms") return pool.filter(r => r.phone);
        if (channel === "email") return pool.filter(r => r.email);
        return pool;
    })();

    // ── Individual picker search list ─────────────────────────────────────────
    const filteredForPicker = recipients.filter(r => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        return (
            r.name.toLowerCase().includes(q) ||
            (r.phone ?? "").includes(q) ||
            (r.email ?? "").toLowerCase().includes(q)
        );
    });

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Send ──────────────────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!message.trim()) { toast.error("Message cannot be empty"); return; }
        if (effectiveRecipients.length === 0) { toast.error("No recipients — they may lack a phone/email"); return; }
        if (channel === "email" && !subject.trim()) { toast.error("Email subject is required"); return; }

        const confirmed = window.confirm(
            `Send ${channel.toUpperCase()} to ${effectiveRecipients.length} recipient${effectiveRecipients.length !== 1 ? "s" : ""}?`
        );
        if (!confirmed) return;

        setSending(true);
        setSentResult(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers = {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`,
                "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            };
            const baseUrl = import.meta.env.VITE_SUPABASE_URL;

            let sent = 0;
            let failed = 0;

            if (channel === "sms") {
                // One call per recipient via your existing send-sms edge function
                for (const r of effectiveRecipients) {
                    if (!r.phone) continue;
                    try {
                        const res = await fetch(`${baseUrl}/functions/v1/send-sms`, {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                type: "admin.alert",
                                record: {
                                    seller_phone: r.phone,
                                    admin_phone: r.phone,
                                    message: message.trim(),
                                },
                            }),
                        });
                        res.ok ? sent++ : failed++;
                    } catch { failed++; }
                    // Respect Arkesel rate limits
                    await new Promise(res => setTimeout(res, 150));
                }
            } else {
                // Custom broadcast mode — requires edge function update (see note in UI)
                const res = await fetch(`${baseUrl}/functions/v1/send-marketing-email`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        mode: "custom_broadcast",
                        subject: subject.trim(),
                        html_message: message.trim(),
                        recipient_ids: effectiveRecipients.map(r => r.id),
                    }),
                });
                const data = await res.json();
                sent = data.sent ?? effectiveRecipients.length;
                failed = data.failed ?? 0;
            }

            setSentResult({ sent, failed });
            toast.success(`✓ Sent to ${sent} recipient${sent !== 1 ? "s" : ""}${failed > 0 ? ` · ${failed} failed` : ""}`);
            setMessage("");
            setSubject("");
            setSelectedIds(new Set());
        } catch (err: any) {
            toast.error(err.message ?? "Send failed");
        } finally {
            setSending(false);
        }
    };

    const canSend =
        message.trim().length > 0 &&
        effectiveRecipients.length > 0 &&
        (channel === "sms" || subject.trim().length > 0);

    // ── UI ────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-2xl">

            {/* Channel toggle */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">Channel</p>
                <div className="flex gap-2">
                    {(["sms", "email"] as Channel[]).map(ch => (
                        <button
                            key={ch}
                            onClick={() => { setChannel(ch); setSentResult(null); }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${channel === ch
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
                        >
                            {ch === "sms"
                                ? <><MessageSquare className="w-4 h-4" /> SMS</>
                                : <><Mail className="w-4 h-4" /> Email</>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recipient mode */}
            <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">Recipients</p>
                <div className="flex gap-2 flex-wrap">
                    {([
                        { id: "all", label: "All", icon: Users },
                        { id: "segment", label: "Segment", icon: SlidersHorizontal },
                        { id: "individual", label: "Individual", icon: UserCheck },
                    ] as { id: RecipientMode; label: string; icon: any }[]).map(m => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id); setSelectedIds(new Set()); setSentResult(null); }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all
                ${mode === m.id
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "border-border text-muted-foreground hover:text-foreground"}`}
                        >
                            <m.icon className="w-3.5 h-3.5" />
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Segment picker */}
                <AnimatePresence>
                    {mode === "segment" && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="mt-3 grid grid-cols-2 gap-2"
                        >
                            {SEGMENTS.map(s => (
                                <button
                                    key={s.value}
                                    onClick={() => setSegment(s.value)}
                                    className={`text-left px-4 py-3 rounded-xl border text-sm transition-all
                    ${segment === s.value
                                            ? "bg-primary/10 border-primary/30 text-primary"
                                            : "border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"}`}
                                >
                                    <p className="font-semibold text-xs">{s.label}</p>
                                    <p className="text-[11px] opacity-70 mt-0.5">{s.desc}</p>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Individual picker */}
                <AnimatePresence>
                    {mode === "individual" && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="mt-3 space-y-2"
                        >
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background">
                                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, phone, or email…"
                                    className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground font-[inherit]"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")}>
                                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                )}
                            </div>

                            {/* Selected chips */}
                            {selectedIds.size > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {[...selectedIds].map(id => {
                                        const r = recipients.find(x => x.id === id);
                                        if (!r) return null;
                                        return (
                                            <span key={id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                                {r.name}
                                                <button onClick={() => toggleSelected(id)}><X className="w-3 h-3" /></button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="rounded-xl border border-border overflow-hidden max-h-52 overflow-y-auto">
                                {loadingRecipients ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                                    </div>
                                ) : filteredForPicker.length === 0 ? (
                                    <p className="text-center py-8 text-sm text-muted-foreground">No users found</p>
                                ) : (
                                    filteredForPicker.map((r, i) => (
                                        <button
                                            key={r.id}
                                            onClick={() => toggleSelected(r.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                        ${i > 0 ? "border-t border-border" : ""}
                        ${selectedIds.has(r.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                                        >
                                            <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors
                        ${selectedIds.has(r.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                                {selectedIds.has(r.id) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{r.name}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    {r.phone && (
                                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                            <Phone className="w-2.5 h-2.5" />{r.phone}
                                                        </span>
                                                    )}
                                                    {r.email && (
                                                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                            <AtSign className="w-2.5 h-2.5" />{r.email}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0
                        ${r.is_official ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                                    : r.verified ? "bg-green-500/10  text-green-600  border-green-500/20"
                                                        : r.is_seller ? "bg-blue-500/10   text-blue-600   border-blue-500/20"
                                                            : "bg-muted text-muted-foreground border-border"}`}>
                                                {r.is_official ? "Official" : r.verified ? "Verified" : r.is_seller ? "Seller" : "Buyer"}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Recipient count */}
                {(mode !== "individual" || selectedIds.size > 0) && (
                    <motion.p
                        key={`${channel}-${mode}-${segment}-${selectedIds.size}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-2 text-xs text-muted-foreground"
                    >
                        {loadingRecipients ? "Counting…" : (
                            <>
                                <span className="font-bold text-foreground">{effectiveRecipients.length}</span>
                                {" "}recipient{effectiveRecipients.length !== 1 ? "s" : ""} will receive this {channel === "sms" ? "SMS" : "email"}
                            </>
                        )}
                    </motion.p>
                )}
            </div>

            {/* Compose */}
            <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">Compose</p>

                {channel === "email" && (
                    <input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Email subject…"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none
              focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground font-[inherit]"
                    />
                )}

                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={channel === "sms"
                        ? "Type your SMS message… (keep it under 160 chars for a single SMS)"
                        : "Type your email message… (plain text or basic HTML)"}
                    rows={channel === "sms" ? 4 : 6}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none resize-none
            focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground font-[inherit]"
                />

                {channel === "sms" && message.length > 0 && (
                    <p className={`text-[11px] text-right ${message.length > 160 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {message.length} chars · {Math.ceil(message.length / 160)} SMS part{Math.ceil(message.length / 160) !== 1 ? "s" : ""}
                    </p>
                )}
            </div>

            {/* Send button */}
            <div className="flex items-center gap-3">
                <button
                    onClick={handleSend}
                    disabled={!canSend || sending}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold
            hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {sending
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                        : <><Send className="w-4 h-4" /> Send {channel === "sms" ? "SMS" : "Email"}</>}
                </button>

                {sentResult && (
                    <motion.p initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Sent to {sentResult.sent}{sentResult.failed > 0 ? ` · ${sentResult.failed} failed` : ""}
                    </motion.p>
                )}
            </div>

            {/* Email edge function note */}
            {channel === "email" && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-xs text-amber-600 leading-relaxed">
                        <span className="font-bold">Note:</span> Email broadcasting requires your{" "}
                        <code className="font-mono bg-amber-500/10 px-1 rounded">send-marketing-email</code> edge function
                        to handle <code className="font-mono bg-amber-500/10 px-1 rounded">mode: "custom_broadcast"</code>.
                        Paste the updated edge function from the README into your Supabase dashboard.
                    </p>
                </div>
            )}

        </div>
    );
};

export default MessagingTab;