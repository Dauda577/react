import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, ShoppingBag, Package, Users,
  BarChart2, Star, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useOrders } from "@/context/OrderContext";
import { useListings } from "@/context/ListingContext";
import { useRatings } from "@/context/RatingContext";
import { useAuth } from "@/context/AuthContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

const GHS = (n: number) =>
  n >= 1000 ? `GHS ${(n / 1000).toFixed(1)}k` : `GHS ${n}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

// ─── Stat Card ──────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon, label, value, sub, trend, color,
}: {
  icon: any; label: string; value: string; sub?: string;
  trend?: { value: number; positive: boolean }; color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-border bg-card p-4"
  >
    <div className="flex items-start justify-between gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full
          ${trend.positive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
          {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <p className="font-display text-xl font-bold tracking-tight mt-3">{value}</p>
    <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
  </motion.div>
);

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.name === "Revenue" ? GHS(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const SellerDashboard = () => {
  const { user } = useAuth();
  const { orders } = useOrders();
  const { listings } = useListings();
  const { getSellerStats } = useRatings();

  const stats = user?.id ? getSellerStats(user.id) : null;

  // Only seller's orders
  const myOrders = useMemo(() =>
    orders.filter((o: any) => o.sellerId === user?.id || o.items?.some((i: any) => i.sellerId === user?.id)),
    [orders, user?.id]
  );

  // ── Key metrics ───────────────────────────────────────────────────────────
  const totalRevenue = useMemo(() =>
    myOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0),
    [myOrders]
  );

  const completedOrders = useMemo(() =>
    myOrders.filter((o: any) => o.status === "delivered").length,
    [myOrders]
  );

  const pendingOrders = useMemo(() =>
    myOrders.filter((o: any) => o.status === "pending").length,
    [myOrders]
  );

  const activeListings = listings.filter((l: any) => l.status === "active").length;
  const soldListings = listings.filter((l: any) => l.status === "sold").length;
  const totalViews = listings.reduce((sum: number, l: any) => sum + (l.views || 0), 0);

  // ── Revenue over last 6 months ────────────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const now = new Date();
    const months: { month: string; Revenue: number; Orders: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = MONTHS[d.getMonth()];
      const monthOrders = myOrders.filter((o: any) => {
        const od = new Date(o.placedAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      months.push({
        month: label,
        Revenue: monthOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0),
        Orders: monthOrders.length,
      });
    }
    return months;
  }, [myOrders]);

  // ── Top listings by views / sales ────────────────────────────────────────
  const topListings = useMemo(() =>
    [...listings]
      .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
      .slice(0, 5),
    [listings]
  );

  // ── Buyer city distribution ───────────────────────────────────────────────
  const cityData = useMemo(() => {
    const cityMap: Record<string, number> = {};
    myOrders.forEach((o: any) => {
      const city = o.buyer?.city || o.buyer?.region || "Other";
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    return Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [myOrders]);

  // ── Category breakdown ────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    listings.forEach((l: any) => {
      const cat = l.category || l.brand || "Other";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [listings]);

  // ── Conversion rate ───────────────────────────────────────────────────────
  const conversionRate = totalViews > 0
    ? ((soldListings / totalViews) * 100).toFixed(1)
    : "0.0";

  // ── This vs last month ────────────────────────────────────────────────────
  const thisMonth = revenueByMonth[5]?.Revenue ?? 0;
  const lastMonth = revenueByMonth[4]?.Revenue ?? 0;
  const revTrend = lastMonth > 0
    ? { value: Math.round(((thisMonth - lastMonth) / lastMonth) * 100), positive: thisMonth >= lastMonth }
    : undefined;

  return (
    <div className="space-y-6">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={TrendingUp} label="Total Revenue" value={GHS(totalRevenue)}
          sub={`${completedOrders} completed orders`}
          trend={revTrend}
          color="bg-indigo-500/10 text-indigo-500"
        />
        <StatCard
          icon={ShoppingBag} label="Orders" value={`${myOrders.length}`}
          sub={`${pendingOrders} pending`}
          color="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          icon={Package} label="Listings" value={`${activeListings} active`}
          sub={`${soldListings} sold`}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          icon={Users} label="Total Views" value={totalViews.toLocaleString()}
          sub={`${conversionRate}% conversion`}
          color="bg-fuchsia-500/10 text-fuchsia-500"
        />
      </div>

      {/* ── Rating summary ── */}
      {stats && stats.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          </div>
          <div className="flex-1">
            <p className="font-display text-xl font-bold">{stats.avg.toFixed(1)} / 5.0</p>
            <p className="text-xs text-muted-foreground">{stats.count} {stats.count === 1 ? "review" : "reviews"} from buyers</p>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= Math.round(stats.avg) ? "text-yellow-500 fill-yellow-500" : "text-border"}`} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Revenue chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-display font-bold text-sm">Revenue & Orders</p>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </div>
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
        </div>
        {myOrders.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            No orders yet — chart will populate as you make sales
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={revenueByMonth} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2}
                fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* ── Orders per month bar chart ── */}
      {myOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <p className="font-display font-bold text-sm mb-1">Orders per Month</p>
          <p className="text-xs text-muted-foreground mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={revenueByMonth} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* ── Top listings ── */}
      {listings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4"
        >
          <p className="font-display font-bold text-sm mb-1">Top Listings</p>
          <p className="text-xs text-muted-foreground mb-4">Ranked by views</p>
          <div className="space-y-3">
            {topListings.map((listing: any, i) => {
              const maxViews = topListings[0]?.views || 1;
              const pct = Math.max(4, ((listing.views || 0) / maxViews) * 100);
              return (
                <div key={listing.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 flex-shrink-0 text-right">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {listing.image
                      ? <img src={listing.image} alt={listing.name} className="w-full h-full object-contain" />
                      : <span className="text-base">👟</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{listing.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{listing.views || 0} views</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0
                    ${listing.status === "sold" ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"}`}>
                    {listing.status === "sold" ? "Sold" : `GHS ${listing.price}`}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Buyer cities + Category breakdown side by side ── */}
      {(cityData.length > 0 || categoryData.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Buyer locations */}
          {cityData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <p className="font-display font-bold text-sm mb-1">Buyer Locations</p>
              <p className="text-xs text-muted-foreground mb-4">By city / region</p>
              <div className="flex items-center justify-center mb-3">
                <PieChart width={120} height={120}>
                  <Pie data={cityData} cx={55} cy={55} innerRadius={30} outerRadius={52}
                    dataKey="value" paddingAngle={3}>
                    {cityData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-1.5">
                {cityData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Category breakdown */}
          {categoryData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <p className="font-display font-bold text-sm mb-1">Listing Categories</p>
              <p className="text-xs text-muted-foreground mb-4">Your inventory mix</p>
              <div className="flex items-center justify-center mb-3">
                <PieChart width={120} height={120}>
                  <Pie data={categoryData} cx={55} cy={55} innerRadius={30} outerRadius={52}
                    dataKey="value" paddingAngle={3}>
                    {categoryData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-1.5">
                {categoryData.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Empty state */}
      {listings.length === 0 && myOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display text-lg font-bold tracking-tight mb-2">No data yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Create listings and receive orders to see your analytics here.
          </p>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;