import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Ticket, Copy, Trash2, Plus, RefreshCw, Edit2, Save, X, Calendar, Users } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  expires_at: string;
  max_uses: number;
  uses_count: number;
  created_at: string;
};

export const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ max_uses: 0, expires_at: "" });
  const [formData, setFormData] = useState({
    prefix: "",
    codeLength: 8,
    numCodes: 5,
    discountPercent: 10,
    expiresInDays: 30,
    maxUses: 1,
  });

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPromoCodes(data);
    }
    setLoading(false);
  };

  const generatePromoCodes = async () => {
    setGenerating(true);
    const { data, error } = await supabase.rpc("generate_promo_codes", {
      prefix: formData.prefix,
      code_length: formData.codeLength,
      num_codes: formData.numCodes,
      discount_percent: formData.discountPercent,
      expires_in_days: formData.expiresInDays,
      max_uses: formData.maxUses,
    });

    if (!error) {
      toast.success(`${formData.numCodes} promo codes generated!`);
      fetchPromoCodes();
    } else {
      toast.error("Failed to generate promo codes");
    }
    setGenerating(false);
  };

  const deletePromoCode = async (id: string, code: string) => {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (!error) {
      toast.success(`Deleted ${code}`);
      fetchPromoCodes();
    } else {
      toast.error("Failed to delete");
    }
  };

  const startEditing = (promo: PromoCode) => {
    setEditingId(promo.id);
    setEditForm({
      max_uses: promo.max_uses,
      expires_at: promo.expires_at.split("T")[0],
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ max_uses: 0, expires_at: "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.expires_at) {
      toast.error("Please select an expiration date");
      return;
    }

    const { error } = await supabase
      .from("promo_codes")
      .update({
        max_uses: editForm.max_uses,
        expires_at: new Date(editForm.expires_at).toISOString(),
      })
      .eq("id", id);

    if (!error) {
      toast.success("Promo code updated!");
      fetchPromoCodes();
      cancelEditing();
    } else {
      toast.error("Failed to update");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code} to clipboard!`);
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border p-6"
      >
        <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Generate Promo Codes
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
              type="number"
              value={formData.codeLength}
              onChange={(e) => setFormData({ ...formData, codeLength: parseInt(e.target.value) })}
              min={4}
              max={12}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Number of Codes</label>
            <input
              type="number"
              value={formData.numCodes}
              onChange={(e) => setFormData({ ...formData, numCodes: parseInt(e.target.value) })}
              min={1}
              max={100}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Discount %</label>
            <input
              type="number"
              value={formData.discountPercent}
              onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) })}
              min={1}
              max={90}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Valid for (days)</label>
            <input
              type="number"
              value={formData.expiresInDays}
              onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
              min={1}
              max={365}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Max Uses</label>
            <input
              type="number"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
              min={1}
              max={1000}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
        </div>

        <Button
          onClick={generatePromoCodes}
          disabled={generating}
          className="btn-primary rounded-full"
        >
          {generating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Generate {formData.numCodes} Promo Code{formData.numCodes > 1 ? "s" : ""}
        </Button>
      </motion.div>

      {/* Promo Codes List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-display font-bold flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Existing Promo Codes ({promoCodes.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : promoCodes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No promo codes yet. Generate some above!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {promoCodes.map((promo) => {
              const expired = isExpired(promo.expires_at);
              const usageLeft = promo.max_uses - promo.uses_count;
              const usagePercentage = (promo.uses_count / promo.max_uses) * 100;
              const isEditing = editingId === promo.id;
              const daysRemaining = !expired ? getDaysRemaining(promo.expires_at) : 0;

              return (
                <div key={promo.id} className="p-4 hover:bg-muted/30 transition-colors">
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex-1">
                          <code className="font-mono text-lg font-bold text-primary">
                            {promo.code}
                          </code>
                          <div className="text-xs text-muted-foreground mt-1">
                            {promo.discount_percent}% OFF · Created {formatDate(promo.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                            <Users className="w-3 h-3" /> Max Uses
                          </label>
                          <input
                            type="number"
                            value={editForm.max_uses}
                            onChange={(e) => setEditForm({ ...editForm, max_uses: parseInt(e.target.value) })}
                            min={1}
                            max={1000}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Currently used: {promo.uses_count} times
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Expiration Date
                          </label>
                          <input
                            type="date"
                            value={editForm.expires_at}
                            onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => saveEdit(promo.id)}
                          className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <Save className="w-3.5 h-3.5" /> Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors flex items-center gap-2"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="font-mono text-lg font-bold text-primary">
                            {promo.code}
                          </code>
                          {expired && (
                            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
                              Expired
                            </span>
                          )}
                          {usageLeft === 0 && !expired && (
                            <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                              Used Up
                            </span>
                          )}
                          {!expired && usageLeft > 0 && daysRemaining <= 7 && (
                            <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">
                              {daysRemaining} days left
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Ticket className="w-3 h-3" /> {promo.discount_percent}% OFF
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Expires: {formatDate(promo.expires_at)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> Used: {promo.uses_count} / {promo.max_uses}
                          </span>
                        </div>
                        {/* Usage progress bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(promo)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Edit duration or usage limit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyToClipboard(promo.code)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors"
                          title="Copy code"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePromoCode(promo.id, promo.code)}
                          className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Delete code"
                        >
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

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border p-6 bg-muted/20"
      >
        <h4 className="font-display font-semibold mb-2">Quick Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Prefixes help organize codes by campaign (e.g., "WELCOME", "FLASH", "VIP")</li>
          <li>Set "Max Uses" to 1 for single-use codes to prevent sharing</li>
          <li>Discount percentages between 5-20% work best for most promotions</li>
          <li>Expired codes are automatically rejected at checkout</li>
          <li>Click the edit button (✏️) to change a code's expiration date or usage limit</li>
          <li>Codes with 7 days or less remaining show a warning badge</li>
          <li>Check the progress bar to see how close a code is to being fully used</li>
        </ul>
      </motion.div>
    </div>
  );
};