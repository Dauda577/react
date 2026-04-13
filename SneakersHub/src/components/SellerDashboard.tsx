import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, ShoppingBag, Package, Users,
  BarChart2, Star, ArrowUpRight, ArrowDownRight,
  Eye, ShoppingCart, Award, Zap, Clock, DollarSign,
  MapPin, Tag, PieChart as PieChartIcon,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line,
} from "recharts";
import { useOrders } from "@/context/OrderContext";
import { useListings } from "@/context/ListingContext";
import { useRatings } from "@/context/RatingContext";
import { useAuth } from "@/context/AuthContext";

const GH₵ = (n: number) =>
  n >= 1000 ? `GH₵ ${(n / 1000).toFixed(1)}k` : `GH₵ ${n}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#e9d5ff"];
const CHART_GRADIENTS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd"];

const StatCard = ({
  icon: Icon, label, value, sub, trend, color, delay = 0,
}: {
  icon: any; label: string; value: string; sub?: string;
  trend?: { value: number; positive: boolean }; color: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delay * 0.1 }}
    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    className="group relative rounded-2xl border border-border bg-card p-5 overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-2xl" />
    <div className="relative z-10">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm
            ${trend.positive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm font-medium text-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  </motion.div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-bold">{p.name === "Revenue" ? GHS(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const SellerDashboard = () => {
  const { user } = useAuth();
  const { orders } = useOrders();
  const { listings } = useListings();
  const { getSellerStats } = useRatings();

  const stats = user?.id ? getSellerStats(user.id) : null;
  const safeAvg = stats?.average != null && !isNaN(stats.average) ? stats.average : 0;
  const safeCount = stats?.count ?? 0;

  const myOrders = useMemo(() =>
    orders.filter((o) => o.sellerId === user?.id),
    [orders, user?.id]
  );

  const totalRevenue = useMemo(() =>
    myOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [myOrders]
  );

  const completedOrders = myOrders.filter((o) => o.status === "delivered").length;
  const pendingOrders = myOrders.filter((o) => o.status === "pending").length;
  const activeListings = listings.filter((l) => l.status === "active").length;
  const soldListings = listings.filter((l) => l.status === "sold").length;
  const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);

  const revenueByMonth = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthOrders = myOrders.filter((o) => {
        const od = new Date(o.placedAt);
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      return {
        month: MONTHS[d.getMonth()],
        Revenue: monthOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
        Orders: monthOrders.length,
      };
    });
  }, [myOrders]);

  const topListings = useMemo(() =>
    [...listings].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [listings]
  );

  const cityData = useMemo(() => {
    const cityMap: Record<string, number> = {};
    myOrders.forEach((o) => {
      const city = o.buyer?.city || o.buyer?.region || "Other";
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    return Object.entries(cityMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [myOrders]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    listings.forEach((l) => {
      const cat = l.category || l.brand || "Other";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [listings]);

  const conversionRate = totalViews > 0
    ? ((soldListings / totalViews) * 100).toFixed(1)
    : "0.0";

  const thisMonth = revenueByMonth[5]?.Revenue ?? 0;
  const lastMonth = revenueByMonth[4]?.Revenue ?? 0;
  const revTrend = lastMonth > 0
    ? { value: Math.round(((thisMonth - lastMonth) / lastMonth) * 100), positive: thisMonth >= lastMonth }
    : undefined;

  const avgOrderValue = myOrders.length > 0 ? totalRevenue / myOrders.length : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2"
      >
        <h2 className="font-display text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-sm text-muted-foreground">Track your sales, performance, and growth metrics</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={GHS(totalRevenue)}
          sub={`${completedOrders} completed orders`}
          trend={revTrend}
          color="bg-emerald-500/10 text-emerald-500"
          delay={0}
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={myOrders.length.toString()}
          sub={`${pendingOrders} pending`}
          color="bg-blue-500/10 text-blue-500"
          delay={1}
        />
        <StatCard
          icon={DollarSign}
          label="Avg. Order Value"
          value={GHS(avgOrderValue)}
          sub="per transaction"
          color="bg-amber-500/10 text-amber-500"
          delay={2}
        />
        <StatCard
          icon={Eye}
          label="Total Views"
          value={totalViews.toLocaleString()}
          sub={`${conversionRate}% conversion rate`}
          color="bg-purple-500/10 text-purple-500"
          delay={3}
        />
      </div>

      {/* Rating Card */}
      {safeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-gradient-to-r from-amber-500/5 to-transparent p-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <p className="font-display text-3xl font-bold">{safeAvg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">out of 5.0</p>
              </div>
              <div className="h-10 w-px bg-border hidden sm:block" />
              <div>
                <p className="text-sm font-semibold">{safeCount} {safeCount === 1 ? "Review" : "Reviews"}</p>
                <p className="text-xs text-muted-foreground">from verified buyers</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${s <= Math.round(safeAvg) ? "text-amber-500 fill-amber-500" : "text-border"}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-display font-bold text-base">Revenue Trend</p>
              <p className="text-xs text-muted-foreground">Last 6 months performance</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </div>
          {myOrders.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-sm text-muted-foreground">
              <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
              No orders yet — chart will populate as you make sales
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueByMonth} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={{ fill: "#6366f1", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Orders Chart */}
        {myOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-display font-bold text-base">Orders Overview</p>
                <p className="text-xs text-muted-foreground">Monthly order volume</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-violet-500" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueByMonth} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="Orders"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Top Listings */}
      {listings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-display font-bold text-base">Top Performing Items</p>
              <p className="text-xs text-muted-foreground">Ranked by views and engagement</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="space-y-4">
            {topListings.map((listing, i) => {
              const maxViews = topListings[0]?.views || 1;
              const pct = Math.max(4, ((listing.views || 0) / maxViews) * 100);
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.05 }}
                  className="flex items-center gap-3 group hover:bg-muted/30 p-2 rounded-xl transition-all"
                >
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${i === 0 ? "bg-amber-500/20 text-amber-600" :
                        i === 1 ? "bg-gray-400/20 text-gray-500" :
                          i === 2 ? "bg-orange-500/20 text-orange-600" :
                            "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    {i === 0 && <Zap className="absolute -top-1 -right-1 w-3 h-3 text-amber-500" />}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {listing.image
                      ? <img src={listing.image} alt={listing.name} className="w-full h-full object-cover" />
                      : <span className="text-lg">👟</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {listing.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.9 + i * 0.05 }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{listing.views || 0} views</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0
                    ${listing.status === "sold"
                      ? "bg-green-500/10 text-green-600 border border-green-500/20"
                      : "bg-primary/10 text-primary border border-primary/20"}`}>
                    {listing.status === "sold" ? "Sold" : `GH₵ ${listing.price.toLocaleString()}`}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Buyer Insights & Categories */}
      {(cityData.length > 0 || categoryData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cityData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-display font-bold text-base">Buyer Locations</p>
                  <p className="text-xs text-muted-foreground">Geographic distribution</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <PieChart width={160} height={160}>
                  <Pie
                    data={cityData}
                    cx={80}
                    cy={80}
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {cityData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  {cityData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {categoryData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-display font-bold text-base">Category Breakdown</p>
                  <p className="text-xs text-muted-foreground">Inventory distribution</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-500" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <PieChart width={160} height={160}>
                  <Pie
                    data={categoryData}
                    cx={80}
                    cy={80}
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  {categoryData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[(i + 2) % COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <span className="font-semibold">{item.value} items</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Empty State */}
      {listings.length === 0 && myOrders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <BarChart2 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-xl font-bold tracking-tight mb-2">No data yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Create listings and receive orders to see your analytics here.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SellerDashboard;