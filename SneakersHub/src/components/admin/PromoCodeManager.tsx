import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Ticket, Copy, Trash2, Plus, RefreshCw, Save, X,
  Users, Store, Power,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  uses: number;
  active: boolean;
  created_at: string;
  owner_id: string | null;
  source: "admin" | "referral";
  owner_name?: string | null;
};

type Seller = {
  id: string;
  name: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" });

const errMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong";

// Shape of a raw promo_codes row from Supabase (before flattening the join).
type PromoRow = Omit<PromoCode, "owner_name"> & { owner?: { name: string | null } | null };

// ── Component ─────────────────────────────────────────────────────────────────

export const PromoCodeManager = () => {
  // Codes state
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMaxUses, setEditMaxUses] = useState(0);
  const [formData, setFormData] = useState({
    prefix: "",
    codeLength: 8,
    numCodes: 1,
    discountPercent: 10,
    maxUses: 1,
    ownerId: "", // "" = platform-wide
  });

  // Sellers for owner dropdown
  const [sellers, setSellers] = useState<Seller[]>([]);

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
      .select("*, owner:profiles(name)")
      .order("created_at", { ascending: false });

    if (data) {
      setPromoCodes(
        data.map((d: PromoRow) => ({
          ...d,
          owner_name: d.owner?.name ?? null,
        }))
      );
    }
    setCodesLoading(false);
  };

  useEffect(() => {
    fetchSellers();
    fetchPromoCodes();
  }, []);

  // ── Generate codes (server-generated, service-role insert) ────────────────

  const generatePromoCodes = async () => {
    setGenerating(true);
    try {
      const res = await apiPost<{ codes: string[] }>("/api/admin/promo-codes", {
        prefix: formData.prefix.trim(),
        length: formData.codeLength,
        count: formData.numCodes,
        discount_percent: formData.discountPercent,
        max_uses: formData.maxUses,
        owner_id: formData.ownerId || null,
      });
      toast.success(`${res.codes.length} promo code${res.codes.length > 1 ? "s" : ""} generated!`);
      fetchPromoCodes();
    } catch (err) {
      toast.error(errMessage(err));
    }
    setGenerating(false);
  };

  // ── Edit / toggle / delete ─────────────────────────────────────────────────

  const deletePromoCode = async (id: string, code: string) => {
    try {
      await apiDelete(`/api/admin/promo-codes/${id}`);
      toast.success(`Deleted ${code}`);
      fetchPromoCodes();
    } catch (err) {
      toast.error(errMessage(err));
    }
  };

  const toggleActive = async (promo: PromoCode) => {
    try {
      await apiPatch(`/api/admin/promo-codes/${promo.id}`, {
        active: !promo.active,
      });
      fetchPromoCodes();
    } catch (err) {
      toast.error(errMessage(err));
    }
  };

  const startEditing = (promo: PromoCode) => {
    setEditingId(promo.id);
    setEditMaxUses(promo.max_uses);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditMaxUses(0);
  };

  const saveEdit = async (id: string) => {
    try {
      await apiPatch(`/api/admin/promo-codes/${id}`, { max_uses: editMaxUses });
      toast.success("Updated!");
      fetchPromoCodes();
      cancelEditing();
    } catch (err) {
      toast.error(errMessage(err));
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}!`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 mt-5">

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
            <label className="text-xs text-muted-foreground block mb-1">Max Uses</label>
            <input
              type="number" value={formData.maxUses} min={1} max={1000}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          {/* Owner scope */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
              <Store className="w-3 h-3" /> Scope to Seller (optional)
            </label>
            <div className="relative">
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full px-3 py-2 pr-8 rounded-lg border border-border bg-background text-sm appearance-none"
              >
                <option value="">Platform-wide (all sellers)</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {formData.ownerId ? (
              <p className="text-[11px] text-primary mt-1">
                ⚠ Code will only work on this seller's products
              </p>
            ) : (
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
          <div className="divide-y divide-border">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-44" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No promo codes yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {promoCodes.map((promo) => {
              const usageLeft = promo.max_uses - promo.uses;
              const usagePct = (promo.uses / promo.max_uses) * 100;
              const isEditing = editingId === promo.id;

              return (
                <div key={promo.id} className="p-4 hover:bg-muted/30 transition-colors">
                  {isEditing ? (
                    <div className="space-y-3">
                      <code className="font-mono text-lg font-bold text-primary">{promo.code}</code>
                      <div className="max-w-xs">
                        <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Max Uses
                        </label>
                        <input
                          type="number" value={editMaxUses} min={1} max={1000}
                          onChange={(e) => setEditMaxUses(parseInt(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Used: {promo.uses} times</p>
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
                          {!promo.active && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Inactive</span>
                          )}
                          {usageLeft === 0 && promo.active && (
                            <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">Used Up</span>
                          )}
                          {promo.source === "referral" && (
                            <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full">Referral</span>
                          )}
                          {promo.owner_name && (
                            <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Store className="w-2.5 h-2.5" /> {promo.owner_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span><Ticket className="w-3 h-3 inline mr-0.5" />{promo.discount_percent}% OFF</span>
                          <span>•</span>
                          <span><Users className="w-3 h-3 inline mr-0.5" />Used: {promo.uses}/{promo.max_uses}</span>
                          <span>•</span>
                          <span>Created: {formatDate(promo.created_at)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(usagePct, 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(promo)}
                          title={promo.active ? "Deactivate" : "Activate"}
                          className={`p-2 rounded-lg transition-colors hover:bg-muted ${promo.active ? "text-green-600" : "text-muted-foreground"}`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button onClick={() => startEditing(promo)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                          <Users className="w-4 h-4" />
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
    </div>
  );
};