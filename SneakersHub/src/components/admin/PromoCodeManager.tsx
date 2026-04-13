import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Ticket, Copy, Trash2, Plus, RefreshCw, Edit2, Save, X,
  Calendar, Users, Store, CheckCircle, Clock, XCircle, ChevronDown,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  expires_at: string;
  max_uses: number;
  uses_count: number;
  created_at: string;
  seller_id: string | null;
  seller_name?: string;
};

type PromoRequest = {
  id: string;
  seller_id: string;
  seller_name?: string;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  expiry_date: string;
  max_uses: number;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  promo_code_id: string | null;
  created_at: string;
};

type Seller = {
  id: string;
  name: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" });

const isExpired = (d: string) => new Date(d) < new Date();

const getDaysRemaining = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

// ── Component ─────────────────────────────────────────────────────────────────

export const PromoCodeManager = () => {
  const [activeTab, setActiveTab] = useState<"codes" | "requests">("codes");

  // Codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ max_uses: 0, expires_at: "" });
  const [formData, setFormData] = useState({
    prefix: "",
    codeLength: 8,
    numCodes: 1,
    discountPercent: 10,
    expiresInDays: 30,
    maxUses: 1,
    sellerId: "",   // "" = platform-wide
  });

  // Sellers for dropdown
  const [sellers, setSellers] = useState<Seller[]>([]);

  // Requests state
  const [requests, setRequests] = useState<PromoRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchSellers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .or("verified.eq.true,is_official.eq.true")
      .order("name");
    if (data) setSellers(data);
  };

  const fetchPromoCodes = async () => {
    setCodesLoading(true);
    const { data } = await supabase
      .from("promo_codes")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false });

    if (data) {
      setPromoCodes(
        data.map((d: any) => ({
          ...d,
          seller_name: d.profiles?.name ?? null,
        }))
      );
    }
    setCodesLoading(false);
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    const { data } = await supabase
      .from("promo_requests")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false });

    if (data) {
      setRequests(
        data.map((d: any) => ({
          ...d,
          seller_name: d.profiles?.name ?? "Unknown Seller",
        }))
      );
    }
    setRequestsLoading(false);
  };

  useEffect(() => {
    fetchSellers();
    fetchPromoCodes();
    fetchRequests();
  }, []);

  // ── Generate codes ─────────────────────────────────────────────────────────

  const generatePromoCodes = async () => {
    setGenerating(true);
    const { error } = await supabase.rpc("generate_promo_codes", {
      prefix: formData.prefix,
      code_length: formData.codeLength,
      num_codes: formData.numCodes,
      discount_percent: formData.discountPercent,
      expires_in_days: formData.expiresInDays,
      max_uses: formData.maxUses,
      seller_id: formData.sellerId || null,
    });

    if (!error) {
      toast.success(`${formData.numCodes} promo code${formData.numCodes > 1 ? "s" : ""} generated!`);
      fetchPromoCodes();
    } else {
      toast.error("Failed to generate promo codes");
    }
    setGenerating(false);
  };

  // ── Edit codes ─────────────────────────────────────────────────────────────

  const deletePromoCode = async (id: string, code: string) => {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (!error) { toast.success(`Deleted ${code}`); fetchPromoCodes(); }
    else toast.error("Failed to delete");
  };

  const startEditing = (promo: PromoCode) => {
    setEditingId(promo.id);
    setEditForm({ max_uses: promo.max_uses, expires_at: promo.expires_at.split("T")[0] });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ max_uses: 0, expires_at: "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.expires_at) { toast.error("Please select an expiration date"); return; }
    const { error } = await supabase
      .from("promo_codes")
      .update({ max_uses: editForm.max_uses, expires_at: new Date(editForm.expires_at).toISOString() })
      .eq("id", id);
    if (!error) { toast.success("Updated!"); fetchPromoCodes(); cancelEditing(); }
    else toast.error("Failed to update");
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}!`);
  };

  // ── Fulfill request ────────────────────────────────────────────────────────

  const fulfillRequest = async (req: PromoRequest) => {
    setFulfilling(req.id);
    try {
      // Generate a single code scoped to this seller
      const prefix = req.seller_name?.split(" ")[0].toUpperCase().slice(0, 6) ?? "PROMO";
      const expiresInDays = Math.ceil(
        (new Date(req.expiry_date).getTime() - Date.now()) / 86400000
      );

      if (expiresInDays < 1) {
        toast.error("The requested expiry date has already passed");
        setFulfilling(null);
        return;
      }

      // Generate code via RPC — get back the new code id
      const { data: rpcData, error: rpcError } = await supabase.rpc("generate_promo_codes", {
        prefix,
        code_length: 8,
        num_codes: 1,
        discount_percent: req.discount_amount,
        expires_in_days: expiresInDays,
        max_uses: req.max_uses,
        seller_id: req.seller_id,
      });

      if (rpcError) throw rpcError;

      // Fetch the newly created code for this seller to get its id
      const { data: newCode, error: fetchError } = await supabase
        .from("promo_codes")
        .select("id, code")
        .eq("seller_id", req.seller_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !newCode) throw new Error("Could not retrieve generated code");

      // Link code back to request and mark approved
      const { error: updateError } = await supabase
        .from("promo_requests")
        .update({ status: "approved", promo_code_id: newCode.id })
        .eq("id", req.id);

      if (updateError) throw updateError;

      toast.success(`Code ${newCode.code} generated and sent to ${req.seller_name}`);
      fetchRequests();
      fetchPromoCodes();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to fulfill request");
    }
    setFulfilling(null);
  };

  const rejectRequest = async (id: string) => {
    setRejectingId(id);
    const { error } = await supabase
      .from("promo_requests")
      .update({ status: "rejected" })
      .eq("id", id);
    if (!error) { toast.success("Request rejected"); fetchRequests(); }
    else toast.error("Failed to reject");
    setRejectingId(null);
  };

  // ── Counts ─────────────────────────────────────────────────────────────────

  const pendingCount = requests.filter(r => r.status === "pending").length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 mt-5">

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border w-fit">
        {(["codes", "requests"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab === "codes" ? "Promo Codes" : "Requests"}
            {tab === "requests" && pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Codes Tab ── */}
      {activeTab === "codes" && (
        <>
          {/* Generate form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border p-6"
          >
            <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Generate Promo Codes
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Prefix (optional)</label>
                <input
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                  placeholder="SALE"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Code Length</label>
                <input
                  type="number" value={formData.codeLength} min={4} max={12}
                  onChange={(e) => setFormData({ ...formData, codeLength: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Number of Codes</label>
                <input
                  type="number" value={formData.numCodes} min={1} max={100}
                  onChange={(e) => setFormData({ ...formData, numCodes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Discount %</label>
                <input
                  type="number" value={formData.discountPercent} min={1} max={90}
                  onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Valid for (days)</label>
                <input
                  type="number" value={formData.expiresInDays} min={1} max={365}
                  onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Max Uses</label>
                <input
                  type="number" value={formData.maxUses} min={1} max={1000}
                  onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>

              {/* Seller scope — full width on small, 2 cols on large */}
              <div className="col-span-2 md:col-span-3 lg:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                  <Store className="w-3 h-3" /> Scope to Seller (optional)
                </label>
                <div className="relative">
                  <select
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm appearance-none"
                  >
                    <option value="">Platform-wide (all sellers)</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
                {formData.sellerId && (
                  <p className="text-[11px] text-primary mt-1">
                    ⚠ Code will only work on this seller's products
                  </p>
                )}
                {!formData.sellerId && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Code applies to your store (Official) products only
                  </p>
                )}
              </div>
            </div>

            <Button onClick={generatePromoCodes} disabled={generating} className="btn-primary rounded-full">
              {generating
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Plus className="w-4 h-4 mr-2" />
              }
              Generate {formData.numCodes} Promo Code{formData.numCodes > 1 ? "s" : ""}
            </Button>
          </motion.div>

          {/* Codes list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border overflow-hidden"
          >
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="font-display font-bold flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Existing Promo Codes ({promoCodes.length})
              </h3>
              <button onClick={fetchPromoCodes} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {codesLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : promoCodes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No promo codes yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {promoCodes.map((promo) => {
                  const expired = isExpired(promo.expires_at);
                  const usageLeft = promo.max_uses - promo.uses_count;
                  const usagePct = (promo.uses_count / promo.max_uses) * 100;
                  const isEditing = editingId === promo.id;
                  const daysLeft = !expired ? getDaysRemaining(promo.expires_at) : 0;

                  return (
                    <div key={promo.id} className="p-4 hover:bg-muted/30 transition-colors">
                      {isEditing ? (
                        <div className="space-y-3">
                          <code className="font-mono text-lg font-bold text-primary">{promo.code}</code>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                                <Users className="w-3 h-3" /> Max Uses
                              </label>
                              <input
                                type="number" value={editForm.max_uses} min={1} max={1000}
                                onChange={(e) => setEditForm({ ...editForm, max_uses: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">Used: {promo.uses_count} times</p>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Expiration Date
                              </label>
                              <input
                                type="date" value={editForm.expires_at}
                                onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button onClick={() => saveEdit(promo.id)}
                              className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors flex items-center gap-2">
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            <button onClick={cancelEditing}
                              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2">
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="font-mono text-lg font-bold text-primary">{promo.code}</code>
                              {expired && (
                                <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">Expired</span>
                              )}
                              {usageLeft === 0 && !expired && (
                                <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">Used Up</span>
                              )}
                              {!expired && usageLeft > 0 && daysLeft <= 7 && (
                                <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">
                                  {daysLeft}d left
                                </span>
                              )}
                              {promo.seller_name && (
                                <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Store className="w-2.5 h-2.5" /> {promo.seller_name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span><Ticket className="w-3 h-3 inline mr-0.5" />{promo.discount_percent}% OFF</span>
                              <span>•</span>
                              <span><Calendar className="w-3 h-3 inline mr-0.5" />Expires: {formatDate(promo.expires_at)}</span>
                              <span>•</span>
                              <span><Users className="w-3 h-3 inline mr-0.5" />Used: {promo.uses_count}/{promo.max_uses}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(usagePct, 100)}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditing(promo)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => copyToClipboard(promo.code)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => deletePromoCode(promo.id, promo.code)}
                              className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* ── Requests Tab ── */}
      {activeTab === "requests" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="font-display font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" /> Promo Requests
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {pendingCount} pending
                  </span>
                )}
              </h3>
              <button onClick={fetchRequests} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {requestsLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center">
                <Ticket className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-display font-bold">No requests yet</p>
                <p className="text-sm text-muted-foreground mt-1">Seller requests will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {requests.map((req) => (
                  <div key={req.id} className="p-5 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display font-bold text-sm flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-muted-foreground" />
                          {req.seller_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Requested {formatDate(req.created_at)}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${req.status === "pending"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : req.status === "approved"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-muted-foreground mb-0.5">Discount</p>
                        <p className="font-bold">
                          {req.discount_type === "percentage"
                            ? `${req.discount_amount}%`
                            : `GH₵ ${req.discount_amount}`}
                        </p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-muted-foreground mb-0.5">Expires</p>
                        <p className="font-bold">{formatDate(req.expiry_date)}</p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-muted-foreground mb-0.5">Max Uses</p>
                        <p className="font-bold">{req.max_uses}</p>
                      </div>
                      <div className="bg-muted/40 rounded-xl p-3">
                        <p className="text-muted-foreground mb-0.5">Type</p>
                        <p className="font-bold capitalize">{req.discount_type}</p>
                      </div>
                    </div>

                    {/* Note */}
                    {req.note && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
                        "{req.note}"
                      </p>
                    )}

                    {/* Actions — only for pending */}
                    {req.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => fulfillRequest(req)}
                          disabled={fulfilling === req.id}
                          className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {fulfilling === req.id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5" />
                          }
                          Approve & Generate Code
                        </button>
                        <button
                          onClick={() => rejectRequest(req.id)}
                          disabled={rejectingId === req.id}
                          className="flex-1 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {rejectingId === req.id
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />
                          }
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Approved — show linked code */}
                    {req.status === "approved" && req.promo_code_id && (
                      <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 rounded-xl px-3 py-2">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        Code generated and available to seller
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};