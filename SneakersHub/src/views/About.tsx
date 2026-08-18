import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  CheckCircle, ShieldCheck, Zap, Star, ArrowRight, CreditCard, Clock,
  Users, Package, Award, Heart, TrendingUp, Sparkles,
  Store, Wallet, BadgeCheck, Phone
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

const formatCount = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`;
  return `${n}+`;
};

const About = () => {
  const [userCount, setUserCount] = useState<string>("—");
  const [listingCount, setListingCount] = useState<string>("—");
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const fetchCounts = async () => {
    const { count: userCountData } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if (userCountData !== null) setUserCount(formatCount(userCountData));

    const { count: listingCountData } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (listingCountData !== null) setListingCount(formatCount(listingCountData));
  };

  useEffect(() => {
    fetchCounts();

    const profilesChannel = supabase
      .channel('profiles-count')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        () => fetchCounts()
      )
      .subscribe();

    const listingsChannel = supabase
      .channel('listings-count')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listings' },
        () => fetchCounts()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'listings' },
        () => fetchCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(listingsChannel);
    };
  }, []);

  const stats = [
    { value: userCount, label: "Happy Customers", icon: Users, gradient: "from-blue-500 to-cyan-500" },
    { value: listingCount, label: "Products Listed", icon: Package, gradient: "from-purple-500 to-pink-500" },
    { value: "100%", label: "Authentic", icon: ShieldCheck, gradient: "from-green-500 to-emerald-500" },
    { value: "24/7", label: "Support", icon: Clock, gradient: "from-orange-500 to-red-500" },
  ];

  const benefits = [
    {
      icon: ShieldCheck,
      title: "Direct Paystack Split",
      desc: "95% of every sale goes straight to your MoMo or bank via Paystack. No waiting, no manual transfers.",
      color: "text-green-500",
      bg: "bg-green-500/10",
      gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      icon: BadgeCheck,
      title: "Verified Badge",
      desc: "A verified badge appears on all your listings and your seller profile, building instant trust with buyers.",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      gradient: "from-amber-500/20 to-orange-500/20",
    },
    {
      icon: TrendingUp,
      title: "More Sales",
      desc: "Verified sellers consistently get more orders because buyers feel safe paying via Paystack.",
      color: "text-primary",
      bg: "bg-primary/10",
      gradient: "from-primary/20 to-purple-500/20",
    },
    {
      icon: Wallet,
      title: "One-Time GH₵ 50 Fee",
      desc: "Pay once via card or Mobile Money after approval. Your Paystack subaccount is created automatically.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      gradient: "from-blue-500/20 to-indigo-500/20",
    },
  ];

  const steps = [
    {
      step: "01",
      icon: Store,
      title: "Apply to Sell",
      desc: "Go to Account → Settings and fill in your store name, MoMo number, and location.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      step: "02",
      icon: Clock,
      title: "Review Process",
      desc: "Our team reviews your application — usually within 1–2 business days.",
      color: "from-purple-500 to-pink-500",
    },
    {
      step: "03",
      icon: CreditCard,
      title: "One-Time Payment",
      desc: "Pay the GH₵ 50 fee via card or Mobile Money to activate your verified seller account.",
      color: "from-orange-500 to-red-500",
    },
    {
      step: "04",
      icon: Zap,
      title: "Start Selling",
      desc: "Your Paystack subaccount goes live instantly — start receiving payments directly at checkout.",
      color: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20" style={{ paddingTop: `calc(96px + env(safe-area-inset-top, 0px))` }}>
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Heart className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Our Story</span>
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Passion for{" "}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Sneakers
              </span>
            </h1>

            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Where sneaker culture meets authenticity. We're building Africa's most trusted marketplace for premium footwear and fashion.
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" />
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border text-center overflow-hidden">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center mx-auto mb-3`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Story Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-2 gap-12 items-center mb-24"
          >
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight mb-4">
                More Than Just a{" "}
                <span className="text-gradient">Marketplace</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Sneakers Hub was born from an obsession with footwear culture. We believe every pair of sneakers tells a story — of innovation, self-expression, and the relentless pursuit of excellence.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our team hand-picks every product in our collection, ensuring authenticity and quality that meets the highest standards. From performance runners to timeless classics, we curate for those who appreciate craft.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, label: "Authentic", color: "text-green-500", bg: "bg-green-500/10" },
                  { icon: Zap, label: "Fast Delivery", color: "text-amber-500", bg: "bg-amber-500/10" },
                  { icon: Star, label: "Top Quality", color: "text-primary", bg: "bg-primary/10" },
                  { icon: Users, label: "Trusted", color: "text-blue-500", bg: "bg-blue-500/10" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className={`p-4 rounded-xl ${item.bg} border border-border/50 text-center`}
                  >
                    <item.icon className={`w-8 h-8 ${item.color} mx-auto mb-2`} />
                    <p className="text-sm font-semibold">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Get Verified Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">For Sellers</span>
            </motion.div>

            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Become a{" "}
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                Verified Seller
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Submit a quick application and pay a one-time GH₵ 50 fee once approved.
              Unlock Paystack split payments — buyers pay you directly at checkout.
            </p>
          </motion.div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className={`group relative p-6 rounded-2xl bg-gradient-to-br ${benefit.gradient} border border-border hover:border-primary/30 transition-all duration-300`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${benefit.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <benefit.icon className={`w-6 h-6 ${benefit.color}`} />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-lg mb-2">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-border bg-card p-8 mb-12"
          >
            <div className="text-center mb-8">
              <h3 className="font-display text-2xl font-bold mb-2">How It Works</h3>
              <p className="text-muted-foreground">Get started in 4 simple steps</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative text-center"
                >
                  <div className="relative z-10">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${step.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <step.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                      {step.step}
                    </div>
                    <h4 className="font-semibold mb-2">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary/20 to-transparent -translate-y-1/2" />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <Link
                to="/account?tab=settings"
                className="relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-display font-semibold text-base transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105"
              >
                <Store className="w-5 h-5" />
                Apply to Sell Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                Free to apply
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="w-3.5 h-3.5 text-amber-500" />
                GH₵ 50 one-time fee on approval
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-primary" />
                No monthly charges
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;